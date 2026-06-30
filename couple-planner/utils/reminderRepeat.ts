import { format } from 'date-fns';

import { Reminder, ReminderRepeat } from '@/types';

export const REPEAT_OPTIONS: { key: ReminderRepeat; label: string }[] = [
  { key: 'none', label: 'Never' },
  { key: 'daily', label: 'Every Day' },
  { key: 'weekly', label: 'Every Week' },
  { key: 'biweekly', label: 'Every 2 Weeks' },
  { key: 'monthly', label: 'Every Month' },
  { key: 'yearly', label: 'Every Year' },
];

const VALID_REPEATS = new Set<ReminderRepeat>(REPEAT_OPTIONS.map((o) => o.key));

export function normalizeRepeat(repeat?: ReminderRepeat | string | null): ReminderRepeat {
  if (repeat && VALID_REPEATS.has(repeat as ReminderRepeat)) {
    return repeat as ReminderRepeat;
  }
  return 'none';
}

export function getRepeatLabel(repeat?: ReminderRepeat): string {
  return REPEAT_OPTIONS.find((o) => o.key === normalizeRepeat(repeat))?.label ?? 'Never';
}

export function isRepeatingReminder(repeat?: ReminderRepeat): boolean {
  return normalizeRepeat(repeat) !== 'none';
}

export function repeatNeedsTimeOnly(repeat?: ReminderRepeat): boolean {
  return normalizeRepeat(repeat) === 'daily';
}

export function repeatNeedsDatePicker(repeat?: ReminderRepeat): boolean {
  const r = normalizeRepeat(repeat);
  return r === 'none' || r === 'weekly' || r === 'biweekly' || r === 'monthly' || r === 'yearly';
}

export function datePickerLabel(repeat?: ReminderRepeat): string {
  const r = normalizeRepeat(repeat);
  if (r === 'weekly' || r === 'biweekly') return 'Day of week';
  if (r === 'monthly') return 'Day of month';
  if (r === 'yearly') return 'Date each year';
  return 'Date';
}

export function datePickerValue(repeat: ReminderRepeat | undefined, when: Date): string {
  const r = normalizeRepeat(repeat);
  if (r === 'weekly' || r === 'biweekly') return format(when, 'EEEE');
  if (r === 'monthly') return format(when, 'do'); // 1st, 2nd...
  if (r === 'yearly') return format(when, 'MMM d');
  return format(when, 'MMM d, yyyy');
}

export function jsWeekdayToExpoWeekday(date: Date): number {
  return date.getDay() + 1;
}

export function formatReminderSchedule(when: Date, repeat?: ReminderRepeat): string {
  const r = normalizeRepeat(repeat);
  const time = format(when, 'h:mm a');
  if (r === 'daily') return `Every day · ${time}`;
  if (r === 'weekly') return `Every ${format(when, 'EEEE')} · ${time}`;
  if (r === 'biweekly') return `Every 2 weeks · ${format(when, 'EEE, MMM d')} · ${time}`;
  if (r === 'monthly') return `Every month on the ${format(when, 'do')} · ${time}`;
  if (r === 'yearly') return `Every year · ${format(when, 'MMM d')} · ${time}`;
  return format(when, 'EEE, MMM d · h:mm a');
}

export function repeatLabel(repeat?: ReminderRepeat): string | null {
  const r = normalizeRepeat(repeat);
  if (r === 'none') return null;
  return getRepeatLabel(r);
}

const BIWEEKLY_DAYS = 14;

export function advanceBiweeklyIfNeeded(reminder: Reminder): Reminder {
  if (normalizeRepeat(reminder.repeat) !== 'biweekly' || reminder.completed) {
    return reminder;
  }
  let when = new Date(reminder.remindAt);
  const now = Date.now();
  let changed = false;
  while (when.getTime() <= now) {
    when.setDate(when.getDate() + BIWEEKLY_DAYS);
    changed = true;
  }
  if (!changed) return reminder;
  return { ...reminder, remindAt: when.toISOString(), notificationId: undefined };
}

export { BIWEEKLY_DAYS };
