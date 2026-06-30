import { Reminder } from '@/types';

function reminderUpdatedAt(reminder: Reminder): number {
  return new Date(reminder.updatedAt ?? 0).getTime();
}

function mergePair(local: Reminder, remote: Reminder): Reminder {
  const localTime = reminderUpdatedAt(local);
  const remoteTime = reminderUpdatedAt(remote);

  const winner = localTime >= remoteTime ? local : remote;

  return {
    ...winner,
    notificationId: local.notificationId ?? remote.notificationId,
  };
}

export function mergeReminders(local: Reminder[], remote: Reminder[]): Reminder[] {
  const byId = new Map<string, Reminder>();

  for (const remoteReminder of remote) {
    byId.set(remoteReminder.id, remoteReminder);
  }

  for (const localReminder of local) {
    const remoteReminder = byId.get(localReminder.id);
    if (!remoteReminder) {
      byId.set(localReminder.id, localReminder);
      continue;
    }
    byId.set(localReminder.id, mergePair(localReminder, remoteReminder));
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
  );
}

export function touchReminder(reminder: Reminder): Reminder {
  return { ...reminder, updatedAt: new Date().toISOString() };
}
