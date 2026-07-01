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
  AddExpenseInput,
  AddPlanItemInput,
  AddReminderInput,
  AppData,
  AppStatePayload,
  CalendarEvent,
  CategoryGoals,
  CoupleProfile,
  EventCategoryConfig,
  Expense,
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
import { touchReminder, mergeReminders } from '@/utils/reminderMerge';

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
  profile: DEFAULT_PROFILE,
  weeklyGoals: DEFAULT_WEEKLY_GOALS,
  crossedOffDates: [],
};

const SYNCABLE_FIELDS: (keyof AppData)[] = [
  'events',
  'planItems',
  'expenses',
  'planSubcategories',
  'eventCategories',
  'weeklyGoals',
  'crossedOffDates',
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
  const persistEnabledRef = useRef(false);
  const loading = authLoading || !storageReady || (!!userId && !remoteSyncReady);
  userIdRef.current = userId;

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
            eventCategories,
            weeklyGoals: syncWeeklyGoals(eventCategories, {
              ...DEFAULT_WEEKLY_GOALS,
              ...parsed.weeklyGoals,
            }),
            planSubcategories: mergePlanSubcategories(parsed.planSubcategories),
            reminders: parsed.reminders ?? [],
            expenses: pruneOldSettledExpenses(parsed.expenses ?? []),
            crossedOffDates: parsed.crossedOffDates ?? [],
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
            eventCategories,
            weeklyGoals: syncWeeklyGoals(eventCategories, {
              ...DEFAULT_WEEKLY_GOALS,
              ...parsed.weeklyGoals,
            }),
            planSubcategories: mergePlanSubcategories(parsed.planSubcategories),
            reminders: parsed.reminders ?? [],
            expenses: pruneOldSettledExpenses(parsed.expenses ?? []),
            crossedOffDates: parsed.crossedOffDates ?? [],
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
        }
        AsyncStorage.setItem(storageKey(uid), JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const addEvent = useCallback(
    (event: Omit<CalendarEvent, 'id'>) => {
      persist((prev) => ({
        ...prev,
        events: [...prev.events, { ...event, id: generateId() }],
      }));
    },
    [persist]
  );

  const updateEvent = useCallback(
    (event: CalendarEvent) => {
      persist((prev) => ({
        ...prev,
        events: prev.events.map((e) => (e.id === event.id ? event : e)),
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
        const eventCategories = mergeEventCategories(payload.eventCategories ?? prev.eventCategories);
        const next = {
          ...prev,
          events: payload.events,
          planItems: payload.planItems,
          expenses: pruneOldSettledExpenses(payload.expenses),
          planSubcategories: mergePlanSubcategories(payload.planSubcategories ?? prev.planSubcategories),
          eventCategories,
          weeklyGoals: syncWeeklyGoals(eventCategories, {
            ...DEFAULT_WEEKLY_GOALS,
            ...payload.weeklyGoals,
          }),
          crossedOffDates: payload.crossedOffDates ?? prev.crossedOffDates ?? [],
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
    const eventCategories = mergeEventCategories(data.eventCategories);
    return {
      events: data.events,
      planItems: data.planItems,
      expenses: data.expenses,
      planSubcategories: mergePlanSubcategories(data.planSubcategories),
      eventCategories,
      weeklyGoals: syncWeeklyGoals(eventCategories, data.weeklyGoals),
      crossedOffDates: data.crossedOffDates ?? [],
      updatedAt: syncMetaRef.current.lastLocalChangeAt,
    };
  }, [data]);

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
      lastLocalChangeAt: new Date(0).toISOString(),
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
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
