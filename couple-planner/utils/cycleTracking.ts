import { CycleData, CycleLogEntry, CycleLogKind, CycleOwner, CycleProfile } from '@/types';
import { normalizeCycleData, patchCycleSettings } from '@/utils/cycleMerge';

export { normalizeCycleData, patchCycleSettings };

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
    settings:
      kind === 'period' && value !== 'none'
        ? { ...profile.settings, lastPeriodStart: date }
        : profile.settings,
  };
}
