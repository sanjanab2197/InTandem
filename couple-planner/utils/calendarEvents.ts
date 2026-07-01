import { format, parseISO } from 'date-fns';

import { CalendarEvent } from '@/types';

export function getEventEndDate(event: CalendarEvent): string {
  if (event.endDate && event.endDate >= event.date) return event.endDate;
  return event.date;
}

export function eventIncludesDate(event: CalendarEvent, dateStr: string): boolean {
  return dateStr >= event.date && dateStr <= getEventEndDate(event);
}

export function isMultiDayEvent(event: CalendarEvent): boolean {
  return getEventEndDate(event) > event.date;
}

export type SpanSegment = 'start' | 'middle' | 'end';

export function getSpanSegment(event: CalendarEvent, dateStr: string): SpanSegment | null {
  if (!isMultiDayEvent(event) || !eventIncludesDate(event, dateStr)) return null;
  const end = getEventEndDate(event);
  if (dateStr === event.date) return 'start';
  if (dateStr === end) return 'end';
  return 'middle';
}

export function formatEventDateRange(event: CalendarEvent): string {
  if (!isMultiDayEvent(event)) return format(parseISO(event.date), 'MMM d, yyyy');
  const start = parseISO(event.date);
  const end = parseISO(getEventEndDate(event));
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  }
  if (sameYear) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}
