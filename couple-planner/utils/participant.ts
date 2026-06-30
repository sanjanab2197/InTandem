import { CalendarEvent, CoupleProfile, Participant, StatsView } from '@/types';

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
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
  if (p === 'partner1') return firstName(profile.partner1Name);
  return firstName(profile.partner2Name);
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

export const PARTICIPANT_OPTIONS: Participant[] = ['together', 'partner1', 'partner2'];
