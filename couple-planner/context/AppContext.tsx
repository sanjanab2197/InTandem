import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  defaultSubcategoryKey,
  DEFAULT_WEEKLY_GOALS,
  mergeEventCategories,
  pickCategoryColor,
  pickSubcategoryColor,
  syncWeeklyGoals,
  uniqueCategoryKey,
  uniqueSubcategoryKey,
} from '@/constants/eventCategories';
import {
  defaultSubcategory,
  getSubcategoriesForCategory,
  mergePlanSubcategories,
  uniqueSubcategoryKey as uniquePlanSubcategoryKey,
} from '@/constants/plans';
import { useAuth } from '@/context/AuthContext';
import {
  normalizeCalendarEventForSave,
  normalizeCalendarEventForUpdate,
  normalizeCalendarEvents,
} from '@/utils/calendarEventRecord';
import {
  AddExpenseInput,
  AddKeyDateInput,
  AddPlanItemInput,
  AddReminderInput,
  AppData,
  AppStatePayload,
  CalendarEvent,
  CategoryGoals,
  CoupleProfile,
  CycleData,
  CycleLogKind,
  CycleOwner,
  CycleProfile,
  CycleSettings,
  EventCategoryConfig,
  Expense,
  KeyDate,
  PlanCategory,
  PlanItem,
  PlanSubcategoriesByCategory,
  Reminder,
} from '@/types';
import {
  applyReminderNotification,
  cancelReminderNotification,
} from '@/utils/reminderNotifications';
import { pruneOldSettledExpenses } from '@/utils/expenseHistory';
import { createDefaultCycleData, mergeCycleData } from '@/utils/cycleMerge';
import {
  applyCycleLogUpdate,
  cycleOwnerFromSlot,
  getOwnerProfile,
  normalizeCycleData,
  patchCycleSettings,
} from '@/utils/cycleTracking';
import { touchReminder, mergeReminders } from '@/utils/reminderMerge';
import { mergeAppStatePayload } from '@/utils/appStateMerge';

const LEGACY_STORAGE_KEY = '@together_app_data';
const LEGACY_SYNC_META_KEY = '@together_sync_meta';
const LEGACY_OWNER_KEY = '@together_legacy_owner';

function storageKey(userId: string) {
  return `@together_app_data:${userId}`;
}

function syncMetaKey(userId: string) {
  return `@together_sync_meta:${userId}`;
}

interface SyncMeta {
  lastLocalChangeAt: string;
  lastAppliedRemoteAt: string | null;
  syncUserId: string | null;
  syncCoupleId: string | null;
}

const DEFAULT_SYNC_META: SyncMeta = {
  lastLocalChangeAt: new Date(0).toISOString(),
  lastAppliedRemoteAt: null,
  syncUserId: null,
  syncCoupleId: null,
};

const DEFAULT_PROFILE: CoupleProfile = {
  partner1Name: 'Partner 1',
  partner2Name: 'Partner 2',
};

const DEFAULT_DATA: AppData = {
  events: [],
  planItems: [],
  reminders: [],
  expenses: [],
  keyDates: [],
  profile: DEFAULT_PROFILE,
  weeklyGoals: DEFAULT_WEEKLY_GOALS,
  crossedOffDates: [],
  cycleData: createDefaultCycleData(),
};

const SYNCABLE_FIELDS: (keyof AppData)[] = [
  'events',
  'planItems',
  'expenses',
  'keyDates',
  'planSubcategories',
  'eventCategories',
  'weeklyGoals',
  'crossedOffDates',
  'cycleData',
];

function hasSyncableChange(prev: AppData, next: AppData): boolean {
  return SYNCABLE_FIELDS.some(
    (field) => JSON.stringify(prev[field]) !== JSON.stringify(next[field])
  );
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface AppContextValue {
  events: CalendarEvent[];
  planItems: PlanItem[];
  reminders: Reminder[];
  expenses: Expense[];
  keyDates: KeyDate[];
  planSubcategories: PlanSubcategoriesByCategory;
  eventCategories: EventCategoryConfig[];
  profile: CoupleProfile;
  weeklyGoals: CategoryGoals;
  loading: boolean;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: string) => CalendarEvent[];
  addPlanItem: (category: PlanCategory, input: AddPlanItemInput) => void;
  addPlanItemsBatch: (category: PlanCategory, inputs: AddPlanItemInput[]) => void;
  updatePlanItem: (item: PlanItem) => void;
  deletePlanItem: (id: string) => void;
  clearCompletedPlanItems: (category: PlanCategory, subcategory?: string, tripName?: string) => void;
  togglePlanItem: (id: string) => void;
  getPlanItemsByCategory: (category: PlanCategory) => PlanItem[];
  getPlanSubcategories: (category: PlanCategory) => ReturnType<typeof getSubcategoriesForCategory>;
  addPlanSubcategory: (category: PlanCategory, label: string) => void;
  updatePlanSubcategory: (category: PlanCategory, key: string, label: string) => void;
  deletePlanSubcategory: (category: PlanCategory, key: string) => void;
  addReminder: (input: AddReminderInput, mySlot?: 1 | 2 | null) => Promise<Reminder>;
  updateReminder: (reminder: Reminder, mySlot?: 1 | 2 | null) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string) => Promise<Reminder | null>;
  setReminders: (reminders: Reminder[]) => void;
  replaceRemindersFromRemote: (reminders: Reminder[]) => void;
  replaceAppStateFromRemote: (payload: AppStatePayload) => void;
  getAppStatePayload: () => AppStatePayload;
  touchAppStateChange: () => void;
  registerAppStatePushScheduler: (scheduler: (() => void) | null) => void;
  getSyncMeta: () => SyncMeta;
  setLastAppliedRemoteAt: (iso: string) => void;
  resetSyncScope: (userId: string, coupleId: string | null) => void;
  resetScopeLocalFields: () => void;
  setRemoteSyncReady: (ready: boolean) => void;
  storageReady: boolean;
  addExpense: (input: AddExpenseInput) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  settleExpense: (id: string, settled: boolean) => void;
  addKeyDate: (input: AddKeyDateInput) => void;
  updateKeyDate: (item: KeyDate) => void;
  deleteKeyDate: (id: string) => void;
  addEventCategory: (label: string) => void;
  updateEventCategory: (key: string, label: string) => void;
  deleteEventCategory: (key: string) => void;
  addEventSubcategory: (categoryKey: string, label: string) => void;
  updateEventSubcategory: (categoryKey: string, subKey: string, label: string) => void;
  deleteEventSubcategory: (categoryKey: string, subKey: string) => void;
  updateProfile: (profile: CoupleProfile) => void;
  updateWeeklyGoals: (goals: CategoryGoals) => void;
  crossedOffDates: string[];
  toggleCrossOffDate: (date: string) => void;
  isDateCrossedOff: (date: string) => boolean;
  cycleData: CycleData;
  getCycleProfile: (owner: CycleOwner) => CycleProfile;
  canViewCycleProfile: (owner: CycleOwner, mySlot?: 1 | 2 | null) => boolean;
  updateCycleSettings: (owner: CycleOwner, patch: Partial<CycleSettings>) => void;
  setCycleLog: (owner: CycleOwner, date: string, kind: CycleLogKind, value: string, notes?: string) => void;
  addCustomCycleLog: (owner: CycleOwner, date: string, text: string) => void;
  removeCycleLog: (owner: CycleOwner, logId: string) => void;
  markPeriodStart: (owner: CycleOwner, date: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [storageReady, setStorageReady] = useState(false);
  const [remoteSyncReady, setRemoteSyncReady] = useState(true);
  const [syncMeta, setSyncMeta] = useState<SyncMeta>(DEFAULT_SYNC_META);
  const syncMetaRef = useRef<SyncMeta>(DEFAULT_SYNC_META);
  const userIdRef = useRef<string | undefined>(userId);
  const dataRef = useRef<AppData>(DEFAULT_DATA);
  const persistEnabledRef = useRef(false);
  const pushSchedulerRef = useRef<(() => void) | null>(null);
  const loading = authLoading || !storageReady || (!!userId && !remoteSyncReady);
  userIdRef.current = userId;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    syncMetaRef.current = syncMeta;
  }, [syncMeta]);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      persistEnabledRef.current = false;
      setData(DEFAULT_DATA);
      syncMetaRef.current = DEFAULT_SYNC_META;
      setSyncMeta(DEFAULT_SYNC_META);
      setStorageReady(true);
      setRemoteSyncReady(true);
      return;
    }

    let cancelled = false;
    persistEnabledRef.current = false;
    setData(DEFAULT_DATA);
    syncMetaRef.current = { ...DEFAULT_SYNC_META, syncUserId: userId };
    setSyncMeta(syncMetaRef.current);
    setStorageReady(false);
    setRemoteSyncReady(false);

    Promise.all([
      AsyncStorage.getItem(storageKey(userId)),
      AsyncStorage.getItem(syncMetaKey(userId)),
    ])
      .then(async ([stored, storedMeta]) => {
        if (cancelled) return;

        if (storedMeta) {
          try {
            const parsedMeta = JSON.parse(storedMeta) as SyncMeta;
            syncMetaRef.current = {
              ...DEFAULT_SYNC_META,
              ...parsedMeta,
              syncUserId: parsedMeta.syncUserId ?? userId,
            };
            setSyncMeta(syncMetaRef.current);
          } catch {
            syncMetaRef.current = { ...DEFAULT_SYNC_META, syncUserId: userId };
            setSyncMeta(syncMetaRef.current);
          }
        } else {
          syncMetaRef.current = { ...DEFAULT_SYNC_META, syncUserId: userId };
          setSyncMeta(syncMetaRef.current);
        }

        if (stored) {
          const parsed = JSON.parse(stored);
          const eventCategories = mergeEventCategories(parsed.eventCategories);
          setData({
            ...DEFAULT_DATA,
            ...parsed,
            events: normalizeCalendarEvents(parsed.events),
            eventCategories,
            weeklyGoals: syncWeeklyGoals(eventCategories, {
              ...DEFAULT_WEEKLY_GOALS,
              ...parsed.weeklyGoals,
            }),
            planSubcategories: mergePlanSubcategories(parsed.planSubcategories),
            reminders: parsed.reminders ?? [],
            expenses: pruneOldSettledExpenses(parsed.expenses ?? []),
            keyDates: parsed.keyDates ?? [],
            crossedOffDates: parsed.crossedOffDates ?? [],
            cycleData: normalizeCycleData(parsed.cycleData),
          });
          return;
        }

        const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        const legacyOwner = await AsyncStorage.getItem(LEGACY_OWNER_KEY);
        let migratedLegacy = false;
        if (legacy && !cancelled && (!legacyOwner || legacyOwner === userId)) {
          const parsed = JSON.parse(legacy);
          const eventCategories = mergeEventCategories(parsed.eventCategories);
          const migrated = {
            ...DEFAULT_DATA,
            ...parsed,
            events: normalizeCalendarEvents(parsed.events),
            eventCategories,
            weeklyGoals: syncWeeklyGoals(eventCategories, {
              ...DEFAULT_WEEKLY_GOALS,
              ...parsed.weeklyGoals,
            }),
            planSubcategories: mergePlanSubcategories(parsed.planSubcategories),
            reminders: parsed.reminders ?? [],
            expenses: pruneOldSettledExpenses(parsed.expenses ?? []),
            keyDates: parsed.keyDates ?? [],
            crossedOffDates: parsed.crossedOffDates ?? [],
            cycleData: normalizeCycleData(parsed.cycleData),
          };
          setData(migrated);
          await AsyncStorage.setItem(storageKey(userId), JSON.stringify(migrated));
          await AsyncStorage.setItem(LEGACY_OWNER_KEY, userId);
          migratedLegacy = true;
        }
        if (legacy) {
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
          await AsyncStorage.removeItem(LEGACY_SYNC_META_KEY);
        }

        if (!cancelled && !migratedLegacy) {
          setData(DEFAULT_DATA);
        }
      })
      .finally(() => {
        if (!cancelled) {
          persistEnabledRef.current = true;
          setStorageReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const bumpLocalChange = useCallback(() => {
    const next: SyncMeta = {
      ...syncMetaRef.current,
      lastLocalChangeAt: new Date().toISOString(),
      syncUserId: userIdRef.current ?? syncMetaRef.current.syncUserId,
    };
    syncMetaRef.current = next;
    setSyncMeta(next);
    const uid = userIdRef.current;
    if (uid) AsyncStorage.setItem(syncMetaKey(uid), JSON.stringify(next));
  }, []);

  const persist = useCallback(
    (updater: AppData | ((prev: AppData) => AppData), options?: { fromRemote?: boolean }) => {
      setData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        dataRef.current = next;
        const uid = userIdRef.current;
        if (!persistEnabledRef.current || !uid) {
          return next;
        }
        if (!options?.fromRemote && hasSyncableChange(prev, next)) {
          const meta: SyncMeta = {
            ...syncMetaRef.current,
            lastLocalChangeAt: new Date().toISOString(),
            syncUserId: uid ?? syncMetaRef.current.syncUserId,
          };
          syncMetaRef.current = meta;
          setSyncMeta(meta);
          AsyncStorage.setItem(syncMetaKey(uid), JSON.stringify(meta));
          pushSchedulerRef.current?.();
        }
        AsyncStorage.setItem(storageKey(uid), JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const addEvent = useCallback(
    (event: Omit<CalendarEvent, 'id'>) => {
      const normalized = normalizeCalendarEventForSave(event);
      persist((prev) => ({
        ...prev,
        events: [...prev.events, { ...normalized, id: generateId() }],
      }));
    },
    [persist]
  );

  const updateEvent = useCallback(
    (event: CalendarEvent) => {
      const normalized = normalizeCalendarEventForUpdate(event);
      persist((prev) => ({
        ...prev,
        events: prev.events.map((e) => (e.id === normalized.id ? normalized : e)),
      }));
    },
    [persist]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) }));
    },
    [persist]
  );

  const getEventsForDate = useCallback(
    (date: string) =>
      data.events.filter((e) => {
        const end = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
        return date >= e.date && date <= end;
      }),
    [data.events]
  );

  const addPlanItem = useCallback(
    (category: PlanCategory, input: AddPlanItemInput) => {
      persist((prev) => ({
        ...prev,
        planItems: [
          ...prev.planItems,
          {
            id: generateId(),
            text: input.text,
            completed: false,
            category,
            subcategory: input.subcategory,
            tags: input.tags?.length ? input.tags : undefined,
            tripName: input.tripName?.trim() || undefined,
          },
        ],
      }));
    },
    [persist]
  );

  const addPlanItemsBatch = useCallback(
    (category: PlanCategory, inputs: AddPlanItemInput[]) => {
      if (inputs.length === 0) return;
      persist((prev) => ({
        ...prev,
        planItems: [
          ...prev.planItems,
          ...inputs.map((input) => ({
            id: generateId(),
            text: input.text,
            completed: false,
            category,
            subcategory: input.subcategory,
            tags: input.tags?.length ? input.tags : undefined,
            tripName: input.tripName?.trim() || undefined,
          })),
        ],
      }));
    },
    [persist]
  );

  const updatePlanItem = useCallback(
    (item: PlanItem) => {
      persist((prev) => ({
        ...prev,
        planItems: prev.planItems.map((p) => (p.id === item.id ? item : p)),
      }));
    },
    [persist]
  );

  const deletePlanItem = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, planItems: prev.planItems.filter((p) => p.id !== id) }));
    },
    [persist]
  );

  const clearCompletedPlanItems = useCallback(
    (category: PlanCategory, subcategory?: string, tripName?: string) => {
      const normalizeSub = (item: PlanItem) => {
        if (category !== 'travel_ideas' || subcategory === undefined) return item.subcategory;
        const key = item.subcategory;
        if (!key || key === 'ideas' || key === 'itinerary') return 'places';
        return key;
      };

      persist((prev) => ({
        ...prev,
        planItems: prev.planItems.filter(
          (p) =>
            !p.completed ||
            p.category !== category ||
            (subcategory !== undefined && normalizeSub(p) !== subcategory) ||
            (tripName !== undefined && (p.tripName?.trim() ?? '') !== tripName)
        ),
      }));
    },
    [persist]
  );

  const togglePlanItem = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        planItems: prev.planItems.map((p) =>
          p.id === id ? { ...p, completed: !p.completed } : p
        ),
      }));
    },
    [persist]
  );

  const getPlanItemsByCategory = useCallback(
    (category: PlanCategory) => data.planItems.filter((p) => p.category === category),
    [data.planItems]
  );

  const planSubcategories = useMemo(
    () => mergePlanSubcategories(data.planSubcategories),
    [data.planSubcategories]
  );

  const getPlanSubcategories = useCallback(
    (category: PlanCategory) => getSubcategoriesForCategory(category, planSubcategories),
    [planSubcategories]
  );

  const addPlanSubcategory = useCallback(
    (category: PlanCategory, label: string) => {
      if (category === 'reminders' || category === 'expenseflow') return;
      const trimmed = label.trim();
      if (!trimmed) return;
      persist((prev) => {
        const subs = mergePlanSubcategories(prev.planSubcategories);
        const list = subs[category] ?? [];
        const key = uniquePlanSubcategoryKey(trimmed, list);
        return {
          ...prev,
          planSubcategories: {
            ...subs,
            [category]: [...list, { key, label: trimmed }],
          },
        };
      });
    },
    [persist]
  );

  const updatePlanSubcategory = useCallback(
    (category: PlanCategory, key: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      persist((prev) => {
        const subs = mergePlanSubcategories(prev.planSubcategories);
        return {
          ...prev,
          planSubcategories: {
            ...subs,
            [category]: (subs[category] ?? []).map((s) =>
              s.key === key ? { ...s, label: trimmed } : s
            ),
          },
        };
      });
    },
    [persist]
  );

  const deletePlanSubcategory = useCallback(
    (category: PlanCategory, key: string) => {
      persist((prev) => {
        const subs = mergePlanSubcategories(prev.planSubcategories);
        const list = subs[category] ?? [];
        const target = list.find((s) => s.key === key);
        if (!target) return prev;
        if (category !== 'weekly_checklist' && list.length <= 1) return prev;

        const remaining = list.filter((s) => s.key !== key);
        const fallback = remaining[0]?.key;
        return {
          ...prev,
          planSubcategories: {
            ...subs,
            [category]: remaining,
          },
          planItems: prev.planItems.map((item) =>
            item.category === category && item.subcategory === key
              ? { ...item, ...(fallback ? { subcategory: fallback } : {}) }
              : item
          ),
        };
      });
    },
    [persist]
  );

  const setReminders = useCallback(
    (reminders: Reminder[]) => {
      persist((prev) => ({ ...prev, reminders }));
    },
    [persist]
  );

  const replaceRemindersFromRemote = useCallback(
    (remote: Reminder[]) => {
      persist((prev) => ({
        ...prev,
        reminders: mergeReminders(prev.reminders, remote),
      }));
    },
    [persist]
  );

  const replaceAppStateFromRemote = useCallback(
    (payload: AppStatePayload) => {
      persist((prev) => {
        const localPayload: AppStatePayload = {
          events: normalizeCalendarEvents(prev.events),
          planItems: prev.planItems,
          expenses: prev.expenses,
          keyDates: prev.keyDates ?? [],
          planSubcategories: prev.planSubcategories,
          eventCategories: prev.eventCategories,
          weeklyGoals: prev.weeklyGoals,
          crossedOffDates: prev.crossedOffDates ?? [],
          cycleData: prev.cycleData,
          updatedAt: syncMetaRef.current.lastLocalChangeAt,
        };
        const merged = mergeAppStatePayload(localPayload, payload);
        const eventCategories = mergeEventCategories(merged.eventCategories ?? prev.eventCategories);
        const next = {
          ...prev,
          events: normalizeCalendarEvents(merged.events),
          planItems: merged.planItems,
          expenses: pruneOldSettledExpenses(merged.expenses),
          keyDates: merged.keyDates ?? [],
          planSubcategories: mergePlanSubcategories(merged.planSubcategories ?? prev.planSubcategories),
          eventCategories,
          weeklyGoals: syncWeeklyGoals(eventCategories, {
            ...DEFAULT_WEEKLY_GOALS,
            ...merged.weeklyGoals,
          }),
          crossedOffDates: merged.crossedOffDates ?? prev.crossedOffDates ?? [],
          cycleData: mergeCycleData(normalizeCycleData(prev.cycleData), merged.cycleData),
        };
        if (!hasSyncableChange(prev, next)) {
          return prev;
        }
        return next;
      }, { fromRemote: true });
    },
    [persist]
  );

  const getAppStatePayload = useCallback((): AppStatePayload => {
    const snapshot = dataRef.current;
    const eventCategories = mergeEventCategories(snapshot.eventCategories);
    return {
      events: normalizeCalendarEvents(snapshot.events),
      planItems: snapshot.planItems,
      expenses: snapshot.expenses,
      keyDates: snapshot.keyDates,
      planSubcategories: mergePlanSubcategories(snapshot.planSubcategories),
      eventCategories,
      weeklyGoals: syncWeeklyGoals(eventCategories, snapshot.weeklyGoals),
      crossedOffDates: snapshot.crossedOffDates ?? [],
      cycleData: normalizeCycleData(snapshot.cycleData),
      updatedAt: syncMetaRef.current.lastLocalChangeAt,
    };
  }, []);

  const registerAppStatePushScheduler = useCallback((scheduler: (() => void) | null) => {
    pushSchedulerRef.current = scheduler;
  }, []);

  const touchAppStateChange = useCallback(() => {
    bumpLocalChange();
  }, [bumpLocalChange]);

  const getSyncMeta = useCallback(() => syncMetaRef.current, []);

  const setLastAppliedRemoteAt = useCallback((iso: string) => {
    setSyncMeta((prev) => {
      const next: SyncMeta = { ...prev, lastAppliedRemoteAt: iso };
      syncMetaRef.current = next;
      const uid = userIdRef.current;
      if (uid) AsyncStorage.setItem(syncMetaKey(uid), JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSyncScope = useCallback((uid: string, coupleId: string | null) => {
    const next: SyncMeta = {
      ...syncMetaRef.current,
      syncUserId: uid,
      syncCoupleId: coupleId,
    };
    syncMetaRef.current = next;
    setSyncMeta(next);
    AsyncStorage.setItem(syncMetaKey(uid), JSON.stringify(next));
  }, []);

  const resetScopeLocalFields = useCallback(() => {
    persist(
      (prev) => ({
        ...prev,
        reminders: [],
        profile: DEFAULT_PROFILE,
      }),
      { fromRemote: true }
    );
  }, [persist]);

  const addReminder = useCallback(
    async (input: AddReminderInput, mySlot?: 1 | 2 | null) => {
      let created: Reminder = touchReminder({
        id: generateId(),
        text: input.text,
        remindAt: input.remindAt,
        assignee: input.assignee,
        repeat: input.repeat ?? 'none',
        completed: false,
      });
      const notificationId = await applyReminderNotification(created, mySlot);
      created = { ...created, notificationId };

      persist((prev) => ({
        ...prev,
        reminders: [...prev.reminders, created],
      }));
      return created;
    },
    [persist]
  );

  const updateReminder = useCallback(
    async (reminder: Reminder, mySlot?: 1 | 2 | null) => {
      const touched = touchReminder(reminder);
      const notificationId = await applyReminderNotification(touched, mySlot);
      const next = { ...touched, notificationId };
      persist((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) => (r.id === next.id ? next : r)),
      }));
      return next;
    },
    [persist]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      const existing = data.reminders.find((r) => r.id === id);
      await cancelReminderNotification(existing?.notificationId);
      persist((prev) => ({
        ...prev,
        reminders: prev.reminders.filter((r) => r.id !== id),
      }));
    },
    [persist, data.reminders]
  );

  const completeReminder = useCallback(
    async (id: string) => {
      const existing = data.reminders.find((r) => r.id === id);
      if (!existing) return null;
      await cancelReminderNotification(existing.notificationId);
      const updated = touchReminder({
        ...existing,
        completed: !existing.completed,
        notificationId: undefined,
      });
      persist((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) => (r.id === id ? updated : r)),
      }));
      return updated;
    },
    [persist, data.reminders]
  );

  const addExpense = useCallback(
    (input: AddExpenseInput) => {
      const created: Expense = {
        id: generateId(),
        description: input.description,
        amount: input.amount,
        paidBy: input.paidBy,
        splitType: input.splitType,
        settled: false,
        createdAt: new Date().toISOString(),
        notes: input.notes,
      };
      persist((prev) => ({
        ...prev,
        expenses: [created, ...prev.expenses],
      }));
    },
    [persist]
  );

  const updateExpense = useCallback(
    (expense: Expense) => {
      persist((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === expense.id ? expense : e)),
      }));
    },
    [persist]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
      }));
    },
    [persist]
  );

  const settleExpense = useCallback(
    (id: string, settled: boolean) => {
      persist((prev) => {
        const next = prev.expenses.map((e) =>
          e.id === id
            ? {
                ...e,
                settled,
                settledAt: settled ? new Date().toISOString() : undefined,
              }
            : e
        );
        return { ...prev, expenses: pruneOldSettledExpenses(next) };
      });
    },
    [persist]
  );

  const addKeyDate = useCallback(
    (input: AddKeyDateInput) => {
      const created: KeyDate = {
        id: generateId(),
        title: input.title,
        date: input.date,
        kind: input.kind,
        forWhom: input.forWhom,
        notes: input.notes,
        giftIdeas: input.giftIdeas,
        createdAt: new Date().toISOString(),
      };
      persist((prev) => ({
        ...prev,
        keyDates: [...prev.keyDates, created],
      }));
    },
    [persist]
  );

  const updateKeyDate = useCallback(
    (item: KeyDate) => {
      persist((prev) => ({
        ...prev,
        keyDates: prev.keyDates.map((d) => (d.id === item.id ? item : d)),
      }));
    },
    [persist]
  );

  const deleteKeyDate = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        keyDates: prev.keyDates.filter((d) => d.id !== id),
      }));
    },
    [persist]
  );

  const eventCategories = useMemo(
    () => mergeEventCategories(data.eventCategories),
    [data.eventCategories]
  );

  const addEventCategory = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      persist((prev) => {
        const cats = mergeEventCategories(prev.eventCategories);
        const key = uniqueCategoryKey(trimmed, cats);
        const color = pickCategoryColor(cats.length);
        const subColor = pickSubcategoryColor(0);
        const nextCategories = [
          ...cats,
          {
            key,
            label: trimmed,
            color,
            subcategories: [{ key: 'general', label: 'General', color: subColor }],
          },
        ];
        return {
          ...prev,
          eventCategories: nextCategories,
          weeklyGoals: syncWeeklyGoals(nextCategories, { ...prev.weeklyGoals, [key]: 0 }),
        };
      });
    },
    [persist]
  );

  const updateEventCategory = useCallback(
    (key: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      persist((prev) => {
        const cats = mergeEventCategories(prev.eventCategories);
        return {
          ...prev,
          eventCategories: cats.map((c) => (c.key === key ? { ...c, label: trimmed } : c)),
        };
      });
    },
    [persist]
  );

  const deleteEventCategory = useCallback(
    (key: string) => {
      persist((prev) => {
        const cats = mergeEventCategories(prev.eventCategories);
        const target = cats.find((c) => c.key === key);
        if (!target) return prev;

        const remaining = cats.filter((c) => c.key !== key);
        if (remaining.length === 0) return prev;

        const fallbackCat = remaining[0];
        const fallbackSub = defaultSubcategoryKey(fallbackCat);
        const { [key]: _, ...restGoals } = prev.weeklyGoals;

        return {
          ...prev,
          eventCategories: remaining,
          weeklyGoals: syncWeeklyGoals(remaining, restGoals),
          events: prev.events.map((event) =>
            event.category === key
              ? { ...event, category: fallbackCat.key, subcategory: fallbackSub }
              : event
          ),
        };
      });
    },
    [persist]
  );

  const addEventSubcategory = useCallback(
    (categoryKey: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      persist((prev) => {
        const cats = mergeEventCategories(prev.eventCategories);
        return {
          ...prev,
          eventCategories: cats.map((cat) => {
            if (cat.key !== categoryKey) return cat;
            const key = uniqueSubcategoryKey(trimmed, cat.subcategories);
            const color = pickSubcategoryColor(cat.subcategories.length);
            return {
              ...cat,
              subcategories: [...cat.subcategories, { key, label: trimmed, color }],
            };
          }),
        };
      });
    },
    [persist]
  );

  const updateEventSubcategory = useCallback(
    (categoryKey: string, subKey: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      persist((prev) => {
        const cats = mergeEventCategories(prev.eventCategories);
        return {
          ...prev,
          eventCategories: cats.map((cat) =>
            cat.key === categoryKey
              ? {
                  ...cat,
                  subcategories: cat.subcategories.map((sub) =>
                    sub.key === subKey ? { ...sub, label: trimmed } : sub
                  ),
                }
              : cat
          ),
        };
      });
    },
    [persist]
  );

  const deleteEventSubcategory = useCallback(
    (categoryKey: string, subKey: string) => {
      persist((prev) => {
        const cats = mergeEventCategories(prev.eventCategories);
        const cat = cats.find((c) => c.key === categoryKey);
        const target = cat?.subcategories.find((s) => s.key === subKey);
        if (!cat || !target || cat.subcategories.length <= 1) return prev;

        const fallbackSub =
          cat.subcategories.find((s) => s.key !== subKey)?.key ?? defaultSubcategoryKey(cat);

        return {
          ...prev,
          eventCategories: cats.map((c) =>
            c.key === categoryKey
              ? { ...c, subcategories: c.subcategories.filter((s) => s.key !== subKey) }
              : c
          ),
          events: prev.events.map((event) =>
            event.category === categoryKey && event.subcategory === subKey
              ? { ...event, subcategory: fallbackSub }
              : event
          ),
        };
      });
    },
    [persist]
  );

  const updateProfile = useCallback(
    (profile: CoupleProfile) => {
      persist((prev) => {
        if (
          prev.profile.partner1Name === profile.partner1Name &&
          prev.profile.partner2Name === profile.partner2Name &&
          prev.profile.anniversary === profile.anniversary &&
          prev.profile.bio === profile.bio
        ) {
          return prev;
        }
        return { ...prev, profile };
      });
    },
    [persist]
  );

  const updateWeeklyGoals = useCallback(
    (goals: CategoryGoals) => {
      persist((prev) => ({
        ...prev,
        weeklyGoals: syncWeeklyGoals(mergeEventCategories(prev.eventCategories), goals),
      }));
    },
    [persist]
  );

  const crossedOffDates = data.crossedOffDates ?? [];
  const cycleData = useMemo(() => normalizeCycleData(data.cycleData), [data.cycleData]);

  const getCycleProfile = useCallback(
    (owner: CycleOwner) => getOwnerProfile(cycleData, owner),
    [cycleData]
  );

  const canViewCycleProfile = useCallback(
    (owner: CycleOwner, mySlot?: 1 | 2 | null) => {
      const viewer = cycleOwnerFromSlot(mySlot);
      if (viewer === owner) return true;
      return getOwnerProfile(cycleData, owner).settings.shareWithPartner === true;
    },
    [cycleData]
  );

  const updateCycleSettings = useCallback(
    (owner: CycleOwner, patch: Partial<CycleSettings>) => {
      persist((prev) => ({
        ...prev,
        cycleData: patchCycleSettings(prev.cycleData, owner, patch),
      }));
    },
    [persist]
  );

  const setCycleLog = useCallback(
    (owner: CycleOwner, date: string, kind: CycleLogKind, value: string, notes?: string) => {
      persist((prev) => {
        const base = normalizeCycleData(prev.cycleData);
        const profile = base[owner];
        const nextProfile = applyCycleLogUpdate(profile, date, kind, value, notes, generateId);
        return {
          ...prev,
          cycleData: { ...base, [owner]: nextProfile },
        };
      });
    },
    [persist]
  );

  const addCustomCycleLog = useCallback(
    (owner: CycleOwner, date: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      persist((prev) => {
        const base = normalizeCycleData(prev.cycleData);
        const profile = base[owner];
        const now = new Date().toISOString();
        return {
          ...prev,
          cycleData: {
            ...base,
            [owner]: {
              ...profile,
              logs: [
                ...profile.logs,
                {
                  id: generateId(),
                  date,
                  kind: 'other' as const,
                  value: 'custom',
                  notes: trimmed,
                  createdAt: now,
                  updatedAt: now,
                },
              ],
              updatedAt: now,
            },
          },
        };
      });
    },
    [persist]
  );

  const removeCycleLog = useCallback(
    (owner: CycleOwner, logId: string) => {
      persist((prev) => {
        const base = normalizeCycleData(prev.cycleData);
        const profile = base[owner];
        return {
          ...prev,
          cycleData: {
            ...base,
            [owner]: {
              ...profile,
              logs: profile.logs.filter((l) => l.id !== logId),
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [persist]
  );

  const markPeriodStart = useCallback(
    (owner: CycleOwner, date: string) => {
      persist((prev) => {
        let next = patchCycleSettings(prev.cycleData, owner, { lastPeriodStart: date });
        const base = normalizeCycleData(next);
        const profile = base[owner];
        const now = new Date().toISOString();
        const logs = [
          ...profile.logs.filter((l) => !(l.date === date && l.kind === 'period')),
          {
            id: generateId(),
            date,
            kind: 'period' as const,
            value: 'medium',
            createdAt: now,
            updatedAt: now,
          },
        ];
        return {
          ...prev,
          cycleData: {
            ...base,
            [owner]: { ...profile, logs, updatedAt: now },
          },
        };
      });
    },
    [persist]
  );

  const toggleCrossOffDate = useCallback(
    (date: string) => {
      persist((prev) => {
        const current = prev.crossedOffDates ?? [];
        const next = current.includes(date)
          ? current.filter((d) => d !== date)
          : [...current, date].sort();
        return { ...prev, crossedOffDates: next };
      });
    },
    [persist]
  );

  const isDateCrossedOff = useCallback(
    (date: string) => crossedOffDates.includes(date),
    [crossedOffDates]
  );

  const value = useMemo(
    () => ({
      events: data.events,
      planItems: data.planItems,
      reminders: data.reminders,
      expenses: data.expenses,
      keyDates: data.keyDates,
      planSubcategories,
      eventCategories,
      profile: data.profile,
      weeklyGoals: syncWeeklyGoals(eventCategories, data.weeklyGoals),
      loading,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventsForDate,
      addPlanItem,
      addPlanItemsBatch,
      updatePlanItem,
      deletePlanItem,
      clearCompletedPlanItems,
      togglePlanItem,
      getPlanItemsByCategory,
      getPlanSubcategories,
      addPlanSubcategory,
      updatePlanSubcategory,
      deletePlanSubcategory,
      addReminder,
      updateReminder,
      deleteReminder,
      completeReminder,
      setReminders,
      replaceRemindersFromRemote,
      replaceAppStateFromRemote,
      getAppStatePayload,
      touchAppStateChange,
      registerAppStatePushScheduler,
      getSyncMeta,
      setLastAppliedRemoteAt,
      resetSyncScope,
      resetScopeLocalFields,
      setRemoteSyncReady,
      storageReady,
      addExpense,
      updateExpense,
      deleteExpense,
      settleExpense,
      addKeyDate,
      updateKeyDate,
      deleteKeyDate,
      addEventCategory,
      updateEventCategory,
      deleteEventCategory,
      addEventSubcategory,
      updateEventSubcategory,
      deleteEventSubcategory,
      updateProfile,
      updateWeeklyGoals,
      crossedOffDates,
      toggleCrossOffDate,
      isDateCrossedOff,
      cycleData,
      getCycleProfile,
      canViewCycleProfile,
      updateCycleSettings,
      setCycleLog,
      addCustomCycleLog,
      removeCycleLog,
      markPeriodStart,
    }),
    [
      data,
      planSubcategories,
      eventCategories,
      loading,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventsForDate,
      addPlanItem,
      addPlanItemsBatch,
      updatePlanItem,
      deletePlanItem,
      clearCompletedPlanItems,
      togglePlanItem,
      getPlanItemsByCategory,
      getPlanSubcategories,
      addPlanSubcategory,
      updatePlanSubcategory,
      deletePlanSubcategory,
      addReminder,
      updateReminder,
      deleteReminder,
      completeReminder,
      setReminders,
      replaceRemindersFromRemote,
      replaceAppStateFromRemote,
      getAppStatePayload,
      touchAppStateChange,
      registerAppStatePushScheduler,
      getSyncMeta,
      setLastAppliedRemoteAt,
      resetSyncScope,
      resetScopeLocalFields,
      setRemoteSyncReady,
      storageReady,
      addExpense,
      updateExpense,
      deleteExpense,
      settleExpense,
      addKeyDate,
      updateKeyDate,
      deleteKeyDate,
      addEventCategory,
      updateEventCategory,
      deleteEventCategory,
      addEventSubcategory,
      updateEventSubcategory,
      deleteEventSubcategory,
      updateProfile,
      updateWeeklyGoals,
      crossedOffDates,
      toggleCrossOffDate,
      isDateCrossedOff,
      cycleData,
      getCycleProfile,
      canViewCycleProfile,
      updateCycleSettings,
      setCycleLog,
      addCustomCycleLog,
      removeCycleLog,
      markPeriodStart,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
