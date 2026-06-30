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
    } catch {
      // Table may not exist yet — local reminders still work.
    }
  }, [coupleId, replaceRemindersFromRemote]);

  const syncAllToRemote = useCallback(async () => {
    if (!coupleId || !user) return;
    for (const reminder of reminders) {
      try {
        await upsertCoupleReminder(coupleId, user.id, reminder);
      } catch {
        // Continue syncing others.
      }
    }
    await pullRemote();
  }, [coupleId, user, reminders, pullRemote]);

  const removeRemote = useCallback(
    async (reminderId: string) => {
      if (!coupleId) return;
      try {
        await deleteCoupleReminder(reminderId);
      } catch {
        // Ignore.
      }
    },
    [coupleId]
  );

  return { syncAllToRemote, removeRemote };
}

export default function ReminderSync() {
  const { couple } = useCouple();
  const { reminders, setReminders, replaceRemindersFromRemote } = useApp();
  const syncingRef = useRef(false);

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
      .then(replaceRemindersFromRemote)
      .catch(() => {})
      .finally(() => {
        syncingRef.current = false;
      });
  }, [coupleId, replaceRemindersFromRemote]);

  return null;
}
