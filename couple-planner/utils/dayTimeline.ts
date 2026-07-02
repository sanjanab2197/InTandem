import { CalendarEvent } from '@/types';
import { isMultiDayEvent } from '@/utils/calendarEvents';

export const TIMELINE_HOUR_HEIGHT = 72;
export const TIMELINE_HOURS = 24;
export const TIMELINE_TOTAL_HEIGHT = TIMELINE_HOUR_HEIGHT * TIMELINE_HOURS;
export const DEFAULT_EVENT_DURATION_MIN = 60;
export const TIME_STEP_MINUTES = 15;

/** Parse flexible time strings (e.g. "7:00 PM", "19:30") to minutes from midnight. */
export function parseTimeToMinutes(time?: string): number | null {
  if (!time?.trim()) return null;
  const raw = time.trim().toUpperCase().replace(/\s+/g, ' ');

  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = parseInt(m24[2], 10);
    if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
  }

  const m12 = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2] ? parseInt(m12[2], 10) : 0;
    const meridiem = m12[3];
    if (h < 1 || h > 12 || min < 0 || min >= 60) return null;
    if (meridiem === 'AM') {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return h * 60 + min;
  }

  return null;
}

export function formatTimelineHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function formatMinutesLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const min = minutes % 60;
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return min === 0 ? `${h12} ${meridiem}` : `${h12}:${String(min).padStart(2, '0')} ${meridiem}`;
}

export function formatMinutesCompact(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const min = minutes % 60;
  const meridiem = h24 >= 12 ? 'p' : 'a';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return min === 0 ? `${h12}${meridiem}` : `${h12}:${String(min).padStart(2, '0')}${meridiem}`;
}

/** Store as "9:00 AM" for app_state compatibility. */
export function minutesToTimeString(minutes: number): string {
  return formatMinutesLabel(minutes);
}

export function snapMinutes(minutes: number): number {
  const snapped = Math.round(minutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  return Math.max(0, Math.min(snapped, TIMELINE_HOURS * 60 - TIME_STEP_MINUTES));
}

export function minutesFromTimelineY(y: number): number {
  return snapMinutes((y / TIMELINE_TOTAL_HEIGHT) * TIMELINE_HOURS * 60);
}

export function isTodayDate(dateStr: string, now = new Date()): boolean {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

export function getNowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function isAllDayForTimeline(event: CalendarEvent): boolean {
  if (isMultiDayEvent(event)) return true;
  return parseTimeToMinutes(event.time) === null;
}

export function splitTimelineEvents(events: CalendarEvent[]): {
  allDay: CalendarEvent[];
  timed: CalendarEvent[];
} {
  const allDay: CalendarEvent[] = [];
  const timed: CalendarEvent[] = [];
  for (const event of events) {
    if (isAllDayForTimeline(event)) allDay.push(event);
    else timed.push(event);
  }
  timed.sort((a, b) => (parseTimeToMinutes(a.time) ?? 0) - (parseTimeToMinutes(b.time) ?? 0));
  return { allDay, timed };
}

export function getEventEndMinutes(event: CalendarEvent): number {
  const start = parseTimeToMinutes(event.time) ?? 0;
  return start + (event.durationMinutes ?? DEFAULT_EVENT_DURATION_MIN);
}

export type TimedEventLayout = {
  event: CalendarEvent;
  top: number;
  height: number;
  column: number;
  columnCount: number;
  startMinutes: number;
  endMinutes: number;
};

export function layoutTimedEvents(events: CalendarEvent[]): TimedEventLayout[] {
  const sorted = [...events].sort(
    (a, b) => (parseTimeToMinutes(a.time) ?? 0) - (parseTimeToMinutes(b.time) ?? 0)
  );

  const layouts: TimedEventLayout[] = [];
  const columnEnds: number[] = [];

  for (const event of sorted) {
    const startMinutes = parseTimeToMinutes(event.time) ?? 0;
    const endMinutes = getEventEndMinutes(event);
    const duration = endMinutes - startMinutes;
    const height = Math.max((duration / 60) * TIMELINE_HOUR_HEIGHT, 24);
    const top = (startMinutes / 60) * TIMELINE_HOUR_HEIGHT;

    let column = columnEnds.findIndex((end) => end <= startMinutes);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(endMinutes);
    } else {
      columnEnds[column] = endMinutes;
    }

    layouts.push({
      event,
      top,
      height,
      column,
      columnCount: 1,
      startMinutes,
      endMinutes,
    });
  }

  for (const layout of layouts) {
    const overlapping = layouts.filter(
      (other) =>
        other.startMinutes < layout.endMinutes && other.endMinutes > layout.startMinutes
    );
    layout.columnCount = Math.max(...overlapping.map((o) => o.column), 0) + 1;
  }

  return layouts;
}

export function getTimelineScrollOffset(
  dateStr: string,
  timedEvents: CalendarEvent[],
  now = new Date()
): number {
  if (isTodayDate(dateStr, now)) {
    const nowMin = getNowMinutes(now);
    return Math.max(0, (nowMin / 60 - 1) * TIMELINE_HOUR_HEIGHT);
  }
  if (timedEvents.length === 0) return 8 * TIMELINE_HOUR_HEIGHT;
  const first = parseTimeToMinutes(timedEvents[0].time) ?? 8 * 60;
  return Math.max(0, (first / 60 - 1) * TIMELINE_HOUR_HEIGHT);
}

export function eventTextColor(_hex: string): string {
  return '#fff';
}
