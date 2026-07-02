import { CalendarEvent, CoupleProfile, DayViewFilterKey, DayViewFilters, Participant, StatsView } from '@/types';
import { Theme } from '@/constants/Theme';

export interface ParticipantTheme {
  color: string;
  colorLight: string;
  colorDark: string;
}

/** Shared colors for together / each partner across calendar, events, and stats. */
export const PARTICIPANT_THEME: Record<Participant, ParticipantTheme> = {
  together: Theme.participants.together,
  partner1: Theme.participants.partner1,
  partner2: Theme.participants.partner2,
};

export function getParticipantTheme(participant: Participant): ParticipantTheme {
  return PARTICIPANT_THEME[participant];
}

export function participantOptionColors(): Record<Participant, string> {
  return {
    together: PARTICIPANT_THEME.together.color,
    partner1: PARTICIPANT_THEME.partner1.color,
    partner2: PARTICIPANT_THEME.partner2.color,
  };
}

export function resolveParticipantColor(participant?: Participant): string {
  return getParticipantTheme(normalizeParticipant(participant)).color;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Tab/chip label — keeps "Partner 1" distinct from "Partner 2" when names aren't set yet. */
export function partnerTabLabel(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'Partner';
  if (/^Partner [12]$/i.test(trimmed)) return trimmed;
  return firstName(trimmed);
}

export function normalizeParticipant(participant?: Participant): Participant {
  return participant ?? 'together';
}

export function participantLabel(
  participant: Participant | undefined,
  profile: CoupleProfile
): string {
  const p = normalizeParticipant(participant);
  if (p === 'together') return 'Together';
  if (p === 'partner1') return partnerTabLabel(profile.partner1Name);
  return partnerTabLabel(profile.partner2Name);
}

export function filterEventsByStatsView(
  events: CalendarEvent[],
  view: StatsView
): CalendarEvent[] {
  return events.filter((e) => {
    const p = normalizeParticipant(e.participant);
    if (p === 'together') return true;
    return p === view;
  });
}

export function defaultDayViewFilters(mySlot?: 1 | 2 | null): DayViewFilters {
  return {
    partner1: mySlot !== 2,
    partner2: mySlot === 2,
    together: true,
  };
}

export function toggleDayViewFilter(filters: DayViewFilters, key: DayViewFilterKey): DayViewFilters {
  return { ...filters, [key]: !filters[key] };
}

export function filterEventsByDayView(events: CalendarEvent[], filters: DayViewFilters): CalendarEvent[] {
  if (!filters.partner1 && !filters.partner2 && !filters.together) return [];

  return events.filter((e) => {
    const p = normalizeParticipant(e.participant);
    if (p === 'together') return filters.together;
    if (p === 'partner1') return filters.partner1;
    return filters.partner2;
  });
}

export function defaultParticipantFromFilters(
  filters: DayViewFilters,
  mySlot?: 1 | 2 | null
): Participant {
  if (filters.together && !filters.partner1 && !filters.partner2) return 'together';
  if (mySlot === 2 && filters.partner2) return 'partner2';
  if (filters.partner1) return 'partner1';
  if (filters.partner2) return 'partner2';
  if (filters.together) return 'together';
  return mySlot === 2 ? 'partner2' : 'partner1';
}

export const PARTICIPANT_OPTIONS: Participant[] = ['together', 'partner1', 'partner2'];
