import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import { syncAllReminderNotifications } from '@/utils/reminderNotifications';
import {
  deleteCoupleReminder,
  fetchCoupleReminders,
  upsertCoupleReminder,
} from '@/utils/remindersApi';

const PUSH_DEBOUNCE_MS = 800;

function logSyncError(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[ReminderSync] ${label}:`, message);
}

export function useReminderRemoteActions() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { reminders, replaceRemindersFromRemote } = useApp();
  const coupleId = couple?.connected ? couple.coupleId : undefined;

  const pullRemote = useCallback(async () => {
    if (!coupleId) return;
    try {
      const remote = await fetchCoupleReminders(coupleId);
      replaceRemindersFromRemote(remote);
    } catch (error) {
      logSyncError('Pull failed — run supabase/reminders.sql in Supabase if table is missing', error);
    }
  }, [coupleId, replaceRemindersFromRemote]);

  const syncAllToRemote = useCallback(async () => {
    if (!coupleId || !user) return;
    for (const reminder of reminders) {
      try {
        await upsertCoupleReminder(coupleId, user.id, reminder);
      } catch (error) {
        logSyncError('Push reminder failed', error);
      }
    }
    await pullRemote();
  }, [coupleId, user, reminders, pullRemote]);

  const removeRemote = useCallback(
    async (reminderId: string) => {
      if (!coupleId) return;
      try {
        await deleteCoupleReminder(reminderId);
      } catch (error) {
        logSyncError('Delete reminder failed', error);
      }
    },
    [coupleId]
  );

  return { syncAllToRemote, removeRemote, pullRemote };
}

export default function ReminderSync() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const { reminders, setReminders, replaceRemindersFromRemote } = useApp();
  const syncingRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPushRef = useRef(false);

  const coupleId = couple?.connected ? couple.coupleId : undefined;
  const mySlot = couple?.mySlot ?? null;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;

    (async () => {
      const synced = await syncAllReminderNotifications(reminders, mySlot);
      if (cancelled) return;
      const changed = synced.some((r) => {
        const prev = reminders.find((x) => x.id === r.id);
        return !prev || r.notificationId !== prev.notificationId || r.remindAt !== prev.remindAt;
      });
      if (changed) setReminders(synced);
    })();

    return () => {
      cancelled = true;
    };
  }, [reminders, mySlot, setReminders]);

  useEffect(() => {
    if (!coupleId || syncingRef.current) return;
    syncingRef.current = true;
    fetchCoupleReminders(coupleId)
      .then((remote) => {
        skipNextPushRef.current = true;
        replaceRemindersFromRemote(remote);
      })
      .catch((error) => {
        logSyncError('Pull failed', error);
      })
      .finally(() => {
        syncingRef.current = false;
      });
  }, [coupleId, replaceRemindersFromRemote]);

  useEffect(() => {
    if (!coupleId || !user) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      for (const reminder of reminders) {
        try {
          await upsertCoupleReminder(coupleId, user.id, reminder);
        } catch (error) {
          logSyncError('Push failed', error);
        }
      }
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [coupleId, user, reminders]);

  return null;
}
