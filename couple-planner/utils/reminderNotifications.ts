import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Participant, Reminder } from '@/types';
import { normalizeParticipant } from '@/utils/participant';
import {
  advanceBiweeklyIfNeeded,
  jsWeekdayToExpoWeekday,
  normalizeRepeat,
} from '@/utils/reminderRepeat';

export function isNotificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

if (isNotificationsSupported()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function shouldNotifyOnDevice(
  reminder: Reminder,
  mySlot: 1 | 2 | null | undefined
): boolean {
  if (!isNotificationsSupported()) return false;
  if (reminder.completed) return false;
  const assignee = normalizeParticipant(reminder.assignee);
  if (assignee === 'together') return true;
  if (!mySlot) return assignee === 'partner1';
  if (mySlot === 1) return assignee === 'partner1';
  return assignee === 'partner2';
}

export async function ensureNotificationSetup(): Promise<boolean> {
  if (!isNotificationsSupported()) {
    return true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function buildNotificationTrigger(reminder: Reminder): Notifications.NotificationTriggerInput | null {
  const triggerDate = new Date(reminder.remindAt);
  if (Number.isNaN(triggerDate.getTime())) return null;

  const repeat = normalizeRepeat(reminder.repeat);
  const channelId = Platform.OS === 'android' ? 'reminders' : undefined;
  const withChannel = channelId ? { channelId } : {};

  if (repeat === 'daily') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      ...withChannel,
    };
  }

  if (repeat === 'weekly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: jsWeekdayToExpoWeekday(triggerDate),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      ...withChannel,
    };
  }

  if (repeat === 'biweekly') {
    const triggerDate = new Date(reminder.remindAt);
    if (triggerDate.getTime() <= Date.now()) return null;
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    };
  }

  if (repeat === 'monthly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: triggerDate.getDate(),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      ...withChannel,
    };
  }

  if (repeat === 'yearly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: triggerDate.getMonth(),
      day: triggerDate.getDate(),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      ...withChannel,
    };
  }

  if (triggerDate.getTime() <= Date.now()) return null;

  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: triggerDate,
  };
}

export async function scheduleReminderNotification(
  reminder: Reminder
): Promise<string | undefined> {
  if (!isNotificationsSupported()) return undefined;

  const trigger = buildNotificationTrigger(reminder);
  if (!trigger) return undefined;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'InTandem Reminder',
      body: reminder.text,
      data: { reminderId: reminder.id },
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger,
  });
}

export async function cancelReminderNotification(notificationId?: string) {
  if (!isNotificationsSupported() || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Notification may already have fired or been cleared.
  }
}

export async function applyReminderNotification(
  reminder: Reminder,
  mySlot: 1 | 2 | null | undefined
): Promise<string | undefined> {
  if (!isNotificationsSupported()) return undefined;

  await cancelReminderNotification(reminder.notificationId);
  if (!shouldNotifyOnDevice(reminder, mySlot)) return undefined;
  const granted = await ensureNotificationSetup();
  if (!granted) return undefined;
  const ready = advanceBiweeklyIfNeeded(reminder);
  return scheduleReminderNotification(ready);
}

export async function syncAllReminderNotifications(
  reminders: Reminder[],
  mySlot: 1 | 2 | null | undefined
): Promise<Reminder[]> {
  if (!isNotificationsSupported()) return reminders;

  const granted = await ensureNotificationSetup();
  if (!granted) return reminders;

  const updated: Reminder[] = [];
  for (let reminder of reminders) {
    reminder = advanceBiweeklyIfNeeded(reminder);

    if (reminder.completed || !shouldNotifyOnDevice(reminder, mySlot)) {
      await cancelReminderNotification(reminder.notificationId);
      updated.push({ ...reminder, notificationId: undefined });
      continue;
    }

    const repeat = normalizeRepeat(reminder.repeat);
    if (repeat === 'none') {
      const triggerDate = new Date(reminder.remindAt);
      if (triggerDate.getTime() <= Date.now()) {
        updated.push(reminder);
        continue;
      }
    }

    if (reminder.notificationId) {
      updated.push(reminder);
      continue;
    }

    const notificationId = await scheduleReminderNotification(reminder);
    updated.push({ ...reminder, notificationId });
  }

  return updated;
}

export function assigneeFromChoice(
  choice: 'me' | 'partner' | 'both',
  mySlot: 1 | 2 | null | undefined
): Participant {
  if (choice === 'both') return 'together';
  const slot = mySlot ?? 1;
  if (choice === 'me') return slot === 1 ? 'partner1' : 'partner2';
  return slot === 1 ? 'partner2' : 'partner1';
}

export function assigneeToChoice(
  assignee: Participant,
  mySlot: 1 | 2 | null | undefined
): 'me' | 'partner' | 'both' {
  const normalized = normalizeParticipant(assignee);
  if (normalized === 'together') return 'both';
  const slot = mySlot ?? 1;
  if (slot === 1) return normalized === 'partner1' ? 'me' : 'partner';
  return normalized === 'partner2' ? 'me' : 'partner';
}
