import { CalendarEvent, Participant } from '@/types';
import { minutesToTimeString } from '@/utils/dayTimeline';

const PARTICIPANTS: Participant[] = ['together', 'partner1', 'partner2'];

export interface EventSchedulerSaveInput {
  id?: string;
  title: string;
  startDate: string;
  endDate: string;
  isMultiDay: boolean;
  isAllDay: boolean;
  startMinutes: number;
  endMinutes: number;
  participant: Participant;
  description: string;
  category: string;
  subcategory: string;
  fallbackSubcategory?: string;
}

function parseParticipant(value: unknown): Participant {
  if (typeof value === 'string' && PARTICIPANTS.includes(value as Participant)) {
    return value as Participant;
  }
  return 'together';
}

/** Build a clean event record from the scheduler form — no stale fields carried over. */
export function buildCalendarEventFromScheduler(
  input: EventSchedulerSaveInput
): Omit<CalendarEvent, 'id'> & { id?: string } {
  const event: Omit<CalendarEvent, 'id'> & { id?: string } = {
    title: input.title.trim(),
    date: input.startDate,
    participant: input.participant,
  };

  if (input.id) {
    event.id = input.id;
  }

  const notes = input.description.trim();
  if (notes) {
    event.notes = notes;
  }

  if (input.isMultiDay && input.endDate > input.startDate) {
    event.endDate = input.endDate;
  }

  if (!input.isAllDay && !input.isMultiDay) {
    event.time = minutesToTimeString(input.startMinutes);
    event.durationMinutes = input.endMinutes - input.startMinutes;
  }

  const category = input.category.trim();
  if (category) {
    event.category = category;
    const subcategory = input.subcategory.trim() || input.fallbackSubcategory?.trim();
    if (subcategory) {
      event.subcategory = subcategory;
    }
  }

  return event;
}

/** Strip unknown/stale fields from stored or remote event rows. */
export function normalizeCalendarEvent(raw: unknown): CalendarEvent | null {
  if (!raw || typeof raw !== 'object') return null;

  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.date !== 'string') {
    return null;
  }

  const title = row.title.trim();
  if (!title) return null;

  const event: CalendarEvent = {
    id: row.id,
    title,
    date: row.date,
    participant: parseParticipant(row.participant),
  };

  if (typeof row.endDate === 'string' && row.endDate > row.date) {
    event.endDate = row.endDate;
  }

  if (!event.endDate) {
    if (typeof row.time === 'string' && row.time.trim()) {
      event.time = row.time.trim();
    }
    if (typeof row.durationMinutes === 'number' && row.durationMinutes > 0) {
      event.durationMinutes = Math.round(row.durationMinutes);
    }
  }

  if (typeof row.notes === 'string') {
    const notes = row.notes.trim();
    if (notes) event.notes = notes;
  }

  if (typeof row.category === 'string') {
    const category = row.category.trim();
    if (category) {
      event.category = category;
      if (typeof row.subcategory === 'string') {
        const subcategory = row.subcategory.trim();
        if (subcategory) event.subcategory = subcategory;
      }
    }
  }

  return event;
}

export function normalizeCalendarEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const events: CalendarEvent[] = [];

  for (const item of raw) {
    const normalized = normalizeCalendarEvent(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    events.push(normalized);
  }

  return events;
}

export function normalizeCalendarEventForSave(
  event: Omit<CalendarEvent, 'id'> & { id?: string }
): Omit<CalendarEvent, 'id'> {
  const withId = normalizeCalendarEvent({ ...event, id: event.id ?? '__new__' });
  if (!withId) {
    throw new Error('Invalid event');
  }
  const { id: _id, ...rest } = withId;
  return rest;
}

export function normalizeCalendarEventForUpdate(event: CalendarEvent): CalendarEvent {
  const normalized = normalizeCalendarEvent(event);
  if (!normalized) {
    throw new Error('Invalid event');
  }
  return normalized;
}
