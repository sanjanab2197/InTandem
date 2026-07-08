/**
 * Regression tests for cycle log selection logic.
 * Run: node scripts/test-cycle-log.mjs
 */

const DEFAULT_SETTINGS = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  shareWithPartner: false,
};

function defaultProfile() {
  return { settings: { ...DEFAULT_SETTINGS }, logs: [] };
}

function allowsMultipleLogsPerDay(kind) {
  return kind === 'symptom' || kind === 'other';
}

function newLogEntry(date, kind, value, notes, now, id) {
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

function inferLatestPeriodEpisodeStart(profile) {
  const episodes = inferPeriodEpisodes(profile);
  if (episodes.length === 0) return profile.settings.lastPeriodStart;
  return episodes[episodes.length - 1][0];
}

function inferPeriodEpisodes(profile) {
  const dates = profile.logs
    .filter((l) => l.kind === 'period' && l.value && l.value !== 'none')
    .map((l) => l.date)
    .sort();

  const episodes = [];
  let current = [];

  for (const d of dates) {
    if (current.length === 0) {
      current = [d];
      continue;
    }
    const gap = Math.round((new Date(d) - new Date(current[current.length - 1])) / 86400000);
    if (gap === 1) {
      current.push(d);
    } else {
      episodes.push(current);
      current = [d];
    }
  }
  if (current.length > 0) episodes.push(current);
  return episodes;
}

function inferLatestPeriodEpisode(profile) {
  const episodes = inferPeriodEpisodes(profile);
  if (episodes.length === 0) return undefined;
  return episodes[episodes.length - 1];
}

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function datesToAddForContinuousPeriod(profile, date) {
  const latest = inferLatestPeriodEpisode(profile);
  if (!latest) return [date];

  const start = latest[0];
  const end = latest[latest.length - 1];
  const gapAfter = daysBetween(end, date);
  const gapBefore = daysBetween(date, start);

  if (gapAfter === 1) return [date];
  if (gapAfter > 1 && gapAfter <= 14) {
    return Array.from({ length: gapAfter }, (_, i) => addDaysStr(end, i + 1));
  }
  if (gapBefore === 1) return [date];
  if (gapBefore > 1 && gapBefore <= 14) {
    return Array.from({ length: gapBefore }, (_, i) => addDaysStr(date, i));
  }
  return [date];
}

function toggleContinuousPeriodDay(profile, date, createId = () => 'id-1') {
  const now = '2026-06-30T12:00:00.000Z';
  const episodes = inferPeriodEpisodes(profile);
  const episode = episodes.find((ep) => ep.includes(date));
  const periodOn = profile.logs.some((l) => l.date === date && l.kind === 'period' && l.value === 'yes');

  let logs = profile.logs;

  if (periodOn && episode) {
    const idx = episode.indexOf(date);
    const removeDates = new Set(episode.slice(idx));
    logs = logs.filter((l) => !(l.kind === 'period' && removeDates.has(l.date)));
  } else if (!periodOn) {
    const toAdd = datesToAddForContinuousPeriod(profile, date);
    const existing = new Set(
      logs.filter((l) => l.kind === 'period' && l.value === 'yes').map((l) => l.date)
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

  const episodeStart = inferLatestPeriodEpisodeStart({ ...profile, logs });
  return {
    ...profile,
    logs,
    updatedAt: now,
    settings: episodeStart
      ? { ...profile.settings, lastPeriodStart: episodeStart }
      : profile.settings,
  };
}

function applyCycleLogUpdate(profile, date, kind, value, notes, createId = () => 'id-1') {
  const now = '2026-06-30T12:00:00.000Z';
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
    settings: (() => {
      if (kind !== 'period') return profile.settings;
      const episodeStart = inferLatestPeriodEpisodeStart({ ...profile, logs });
      if (episodeStart) {
        return { ...profile.settings, lastPeriodStart: episodeStart };
      }
      const { lastPeriodStart: _removed, ...rest } = profile.settings;
      return rest;
    })(),
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const date = '2026-06-30';
let idCounter = 0;
const nextId = () => `log-${++idCounter}`;

let profile = defaultProfile();

// First single-select log
profile = applyCycleLogUpdate(profile, date, 'mood', 'happy', undefined, nextId);
assert(profile.logs.length === 1, 'first mood log should be added');
assert(profile.logs[0].value === 'happy', 'mood should be happy');

// Switch single-select value (the original bug)
profile = applyCycleLogUpdate(profile, date, 'mood', 'anxious', undefined, nextId);
assert(profile.logs.length === 1, 'switching mood should keep one log');
assert(profile.logs[0].value === 'anxious', 'mood should switch to anxious');

// Toggle off same value
profile = applyCycleLogUpdate(profile, date, 'mood', 'anxious', undefined, nextId);
assert(profile.logs.length === 0, 'tapping same mood again should remove it');

// Period flow switch
profile = applyCycleLogUpdate(profile, date, 'period', 'yes', undefined, nextId);
profile = applyCycleLogUpdate(profile, date, 'period', 'none', undefined, nextId);
assert(profile.logs.length === 0, 'period toggle off should remove log');
profile = applyCycleLogUpdate(profile, date, 'period', 'yes', undefined, nextId);
assert(profile.settings.lastPeriodStart === date, 'first period day sets episode start');

profile = applyCycleLogUpdate(profile, '2026-07-01', 'period', 'yes', undefined, nextId);
assert(profile.settings.lastPeriodStart === date, 'adding next period day in same episode keeps first day as start');

profile = applyCycleLogUpdate(profile, '2026-07-15', 'period', 'yes', undefined, nextId);
assert(profile.settings.lastPeriodStart === '2026-07-15', 'log after a gap starts a new episode');

// Multi-select symptoms
profile = applyCycleLogUpdate(profile, date, 'symptom', 'cramps', undefined, nextId);
profile = applyCycleLogUpdate(profile, date, 'symptom', 'headache', undefined, nextId);
assert(profile.logs.length === 5, 'symptoms should stack with period logs');
const symptoms = profile.logs.filter((l) => l.kind === 'symptom');
assert(symptoms.length === 2, 'two symptoms logged');

profile = applyCycleLogUpdate(profile, date, 'symptom', 'cramps', undefined, nextId);
assert(
  profile.logs.filter((l) => l.kind === 'symptom').length === 1,
  'tapping cramps again removes only cramps'
);

// Continuous period toggle
profile = defaultProfile();
profile = toggleContinuousPeriodDay(profile, '2026-06-01', nextId);
assert(profile.logs.filter((l) => l.kind === 'period').length === 1, 'first tap logs one day');

profile = toggleContinuousPeriodDay(profile, '2026-06-04', nextId);
const periodDates = profile.logs.filter((l) => l.kind === 'period').map((l) => l.date).sort();
assert(
  periodDates.join(',') === '2026-06-01,2026-06-02,2026-06-03,2026-06-04',
  'skipping days fills a continuous run'
);

profile = toggleContinuousPeriodDay(profile, '2026-06-02', nextId);
assert(
  profile.logs.filter((l) => l.kind === 'period').length === 1,
  'turning off mid-period truncates from that day'
);
assert(profile.logs[0].date === '2026-06-01', 'only days before cutoff remain');

console.log('All cycle log tests passed.');
