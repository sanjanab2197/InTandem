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
    settings:
      kind === 'period' && value !== 'none'
        ? { ...profile.settings, lastPeriodStart: date }
        : profile.settings,
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
profile = applyCycleLogUpdate(profile, date, 'period', 'light', undefined, nextId);
profile = applyCycleLogUpdate(profile, date, 'period', 'heavy', undefined, nextId);
assert(profile.logs.length === 1, 'period should replace not duplicate');
assert(profile.logs[0].value === 'heavy', 'period should be heavy');

// Multi-select symptoms
profile = applyCycleLogUpdate(profile, date, 'symptom', 'cramps', undefined, nextId);
profile = applyCycleLogUpdate(profile, date, 'symptom', 'headache', undefined, nextId);
assert(profile.logs.length === 3, 'symptoms should stack with period log');
const symptoms = profile.logs.filter((l) => l.kind === 'symptom');
assert(symptoms.length === 2, 'two symptoms logged');

profile = applyCycleLogUpdate(profile, date, 'symptom', 'cramps', undefined, nextId);
assert(
  profile.logs.filter((l) => l.kind === 'symptom').length === 1,
  'tapping cramps again removes only cramps'
);

console.log('All cycle log tests passed.');
