import { CycleData, CycleLogEntry, CycleProfile, CycleSettings } from '@/types';

const DEFAULT_SETTINGS: CycleSettings = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  shareWithPartner: false,
};

function defaultProfile(): CycleProfile {
  return {
    settings: { ...DEFAULT_SETTINGS },
    logs: [],
  };
}

function normalizeProfile(stored: CycleProfile | undefined): CycleProfile {
  if (!stored) return defaultProfile();
  return {
    settings: { ...DEFAULT_SETTINGS, ...stored.settings },
    logs: Array.isArray(stored.logs) ? stored.logs : [],
    updatedAt: stored.updatedAt,
  };
}

/** Fill missing fields only — never merge timestamps with live defaults. */
export function normalizeCycleData(raw?: CycleData): CycleData {
  return {
    partner1: normalizeProfile(raw?.partner1),
    partner2: normalizeProfile(raw?.partner2),
  };
}

function mergeLogs(a: CycleLogEntry[], b: CycleLogEntry[]): CycleLogEntry[] {
  const map = new Map<string, CycleLogEntry>();
  for (const log of a) map.set(log.id, log);
  for (const log of b) {
    const existing = map.get(log.id);
    if (!existing) {
      map.set(log.id, log);
      continue;
    }
    const aTime = new Date(existing.updatedAt ?? existing.createdAt).getTime();
    const bTime = new Date(log.updatedAt ?? log.createdAt).getTime();
    map.set(log.id, bTime >= aTime ? log : existing);
  }
  return Array.from(map.values()).sort((x, y) => x.date.localeCompare(y.date));
}

function mergeProfile(a: CycleProfile, b: CycleProfile): CycleProfile {
  const aTime = new Date(a.updatedAt ?? 0).getTime();
  const bTime = new Date(b.updatedAt ?? 0).getTime();
  const winner = bTime >= aTime ? b : a;
  const loser = bTime >= aTime ? a : b;
  return {
    settings: { ...normalizeProfile(loser).settings, ...normalizeProfile(winner).settings },
    logs: mergeLogs(a.logs, b.logs),
    updatedAt: new Date(Math.max(aTime, bTime)).toISOString(),
  };
}

export function mergeCycleData(local?: CycleData, remote?: CycleData): CycleData {
  const a = normalizeCycleData(local);
  const b = normalizeCycleData(remote);
  return {
    partner1: mergeProfile(a.partner1, b.partner1),
    partner2: mergeProfile(a.partner2, b.partner2),
  };
}

export function createDefaultCycleData(): CycleData {
  return {
    partner1: defaultProfile(),
    partner2: defaultProfile(),
  };
}

export function patchCycleSettings(
  data: CycleData | undefined,
  owner: 'partner1' | 'partner2',
  patch: Partial<CycleSettings>
): CycleData {
  const base = normalizeCycleData(data);
  const profile = base[owner];
  return {
    ...base,
    [owner]: {
      ...profile,
      settings: { ...profile.settings, ...patch },
      updatedAt: new Date().toISOString(),
    },
  };
}
