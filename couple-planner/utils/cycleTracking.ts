import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import { CycleData, CycleLogEntry, CycleLogKind, CycleOwner, CycleProfile, isPeriodLogged } from '@/types';
import { normalizeCycleData, patchCycleSettings } from '@/utils/cycleMerge';
import { inferLatestPeriodEpisode, inferLatestPeriodEpisodeStart, inferPeriodEpisodes } from '@/utils/cyclePredictions';

export { normalizeCycleData, patchCycleSettings };

/** Max gap (days) to auto-fill when extending a continuous period run. */
const MAX_PERIOD_EXTEND_GAP = 14;

function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function syncPeriodSettings(profile: CycleProfile, logs: CycleLogEntry[]): CycleProfile['settings'] {
  const episodeStart = inferLatestPeriodEpisodeStart({ ...profile, logs });
  if (episodeStart) {
    return { ...profile.settings, lastPeriodStart: episodeStart };
  }
  const { lastPeriodStart: _removed, ...rest } = profile.settings;
  return rest;
}

function datesToAddForContinuousPeriod(profile: CycleProfile, date: string): string[] {
  const latest = inferLatestPeriodEpisode(profile);
  if (!latest) return [date];

  const start = latest[0];
  const end = latest[latest.length - 1];
  const gapAfter = differenceInCalendarDays(parseISO(date), parseISO(end));
  const gapBefore = differenceInCalendarDays(parseISO(start), parseISO(date));

  if (gapAfter === 1) return [date];
  if (gapAfter > 1 && gapAfter <= MAX_PERIOD_EXTEND_GAP) {
    return Array.from({ length: gapAfter }, (_, i) => dateKey(addDays(parseISO(end), i + 1)));
  }
  if (gapBefore === 1) return [date];
  if (gapBefore > 1 && gapBefore <= MAX_PERIOD_EXTEND_GAP) {
    return Array.from({ length: gapBefore }, (_, i) => dateKey(addDays(parseISO(date), i)));
  }

  return [date];
}

/** Toggle period on a day, keeping each period as one continuous run. */
export function toggleContinuousPeriodDay(
  profile: CycleProfile,
  date: string,
  createId: () => string = () => `${Date.now()}`
): CycleProfile {
  const now = new Date().toISOString();
  const episodes = inferPeriodEpisodes(profile);
  const episode = episodes.find((ep) => ep.includes(date));
  const periodOn = profile.logs.some(
    (l) => l.date === date && l.kind === 'period' && isPeriodLogged(l.value)
  );

  let logs = profile.logs;

  if (periodOn && episode) {
    const idx = episode.indexOf(date);
    const removeDates = new Set(episode.slice(idx));
    logs = logs.filter((l) => !(l.kind === 'period' && removeDates.has(l.date)));
  } else if (!periodOn) {
    const toAdd = datesToAddForContinuousPeriod(profile, date);
    const existing = new Set(
      logs.filter((l) => l.kind === 'period' && isPeriodLogged(l.value)).map((l) => l.date)
    );
    for (const d of toAdd) {
      if (existing.has(d)) continue;
      logs = [
        ...logs.filter((l) => !(l.date === d && l.kind === 'period')),
        newLogEntry(d, 'period', 'yes', undefined, now, createId()),
      ];
      existing.add(d);
    }
  }

  return {
    ...profile,
    logs,
    updatedAt: now,
    settings: syncPeriodSettings(profile, logs),
  };
}

export function cycleOwnerFromSlot(slot: 1 | 2 | null | undefined): CycleOwner {
  return slot === 2 ? 'partner2' : 'partner1';
}

export function getOwnerProfile(data: CycleData, owner: CycleOwner): CycleProfile {
  return normalizeCycleData(data)[owner];
}

export function canViewOwnerCycle(
  data: CycleData,
  owner: CycleOwner,
  viewerSlot: 1 | 2 | null | undefined
): boolean {
  const viewer = cycleOwnerFromSlot(viewerSlot);
  if (viewer === owner) return true;
  return getOwnerProfile(data, owner).settings.shareWithPartner === true;
}

export function logsForDate(profile: CycleProfile, date: string) {
  return profile.logs.filter((l) => l.date === date);
}

export function allowsMultipleLogsPerDay(kind: CycleLogKind): boolean {
  return kind === 'symptom' || kind === 'other';
}

function newLogEntry(
  date: string,
  kind: CycleLogKind,
  value: string,
  notes: string | undefined,
  now: string,
  id: string
): CycleLogEntry {
  return {
    id,
    date,
    kind,
    value,
    notes: notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Pure update for cycle logs — used by AppContext and regression tests. */
export function applyCycleLogUpdate(
  profile: CycleProfile,
  date: string,
  kind: CycleLogKind,
  value: string,
  notes?: string,
  createId: () => string = () => `${Date.now()}`
): CycleProfile {
  const now = new Date().toISOString();
  let logs = profile.logs;

  if (value === 'none' || !value.trim()) {
    logs = logs.filter((l) => !(l.date === date && l.kind === kind));
  } else if (allowsMultipleLogsPerDay(kind)) {
    const existing = logs.find((l) => l.date === date && l.kind === kind && l.value === value);
    if (existing) {
      logs = logs.filter((l) => l.id !== existing.id);
    } else {
      logs = [...logs, newLogEntry(date, kind, value, notes, now, createId())];
    }
  } else {
    const existing = logs.find((l) => l.date === date && l.kind === kind);
    if (existing?.value === value) {
      logs = logs.filter((l) => l.id !== existing.id);
    } else {
      logs = [
        ...logs.filter((l) => !(l.date === date && l.kind === kind)),
        newLogEntry(date, kind, value, notes, now, createId()),
      ];
    }
  }

  return {
    ...profile,
    logs,
    updatedAt: now,
    settings: kind === 'period' ? syncPeriodSettings(profile, logs) : profile.settings,
  };
}
