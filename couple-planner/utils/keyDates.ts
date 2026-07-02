import { addYears, differenceInCalendarDays, format, parseISO } from 'date-fns';

import { KeyDateKind, Participant } from '@/types';

export const KEY_DATE_KINDS: KeyDateKind[] = [
  'birthday',
  'anniversary',
  'first_date',
  'engagement',
  'other',
];

export const KEY_DATE_KIND_META: Record<KeyDateKind, { label: string; emoji: string }> = {
  birthday: { label: 'Birthday', emoji: '🎂' },
  anniversary: { label: 'Anniversary', emoji: '💍' },
  first_date: { label: 'First date', emoji: '💕' },
  engagement: { label: 'Engagement', emoji: '💎' },
  other: { label: 'Special day', emoji: '✨' },
};

export function getNextOccurrence(dateStr: string, from = new Date()): Date {
  const parsed = parseISO(dateStr);
  const month = parsed.getMonth();
  const day = parsed.getDate();
  let next = new Date(from.getFullYear(), month, day);
  next.setHours(0, 0, 0, 0);
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  if (next < today) {
    next = addYears(next, 1);
  }
  return next;
}

export function getDaysUntil(dateStr: string, from = new Date()): number {
  const next = getNextOccurrence(dateStr, from);
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(next, today);
}

export function formatCountdown(days: number): string {
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function formatKeyDateLong(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, MMMM d');
}

export function formatKeyDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

export function sortKeyDatesByUpcoming<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));
}

export function whomLabel(forWhom: Participant, p1: string, p2: string): string {
  if (forWhom === 'together') return 'Both of us';
  if (forWhom === 'partner1') return p1;
  return p2;
}

export function yearsSince(dateStr: string): number | null {
  const parsed = parseISO(dateStr);
  const year = parsed.getFullYear();
  if (year <= 1900) return null;
  const today = new Date();
  let years = today.getFullYear() - year;
  const month = parsed.getMonth();
  const day = parsed.getDate();
  const notYet =
    today.getMonth() < month || (today.getMonth() === month && today.getDate() < day);
  if (notYet) years -= 1;
  return years >= 0 ? years : null;
}
