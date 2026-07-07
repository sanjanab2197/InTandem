/**
 * Run: node scripts/test-cycle-predictions.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function inferPeriodStarts(profile) {
  const periodDates = profile.logs
    .filter((l) => l.kind === 'period' && l.value && l.value !== 'none')
    .map((l) => l.date)
    .sort();

  const starts = [];
  for (let i = 0; i < periodDates.length; i += 1) {
    if (i === 0) {
      starts.push(periodDates[0]);
      continue;
    }
    const gap = daysBetween(periodDates[i - 1], periodDates[i]);
    if (gap > 1) starts.push(periodDates[i]);
  }

  if (profile.settings.lastPeriodStart && !starts.includes(profile.settings.lastPeriodStart)) {
    starts.push(profile.settings.lastPeriodStart);
  }

  return [...new Set(starts)].sort();
}

function inferCycleLength(profile) {
  const starts = inferPeriodStarts(profile);
  const gaps = [];
  for (let i = 1; i < starts.length; i += 1) {
    const gap = daysBetween(starts[i - 1], starts[i]);
    if (gap >= 21 && gap <= 45) gaps.push(gap);
  }
  if (gaps.length >= 1) {
    const recent = gaps.slice(-6);
    const avg = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length);
    return { length: avg, source: 'learned', cyclesUsed: recent.length + 1 };
  }
  const fromSettings = profile.settings.averageCycleLength;
  if (fromSettings) return { length: fromSettings, source: 'settings', cyclesUsed: 0 };
  return { length: 28, source: 'default', cyclesUsed: 0 };
}

const profile = {
  settings: { averageCycleLength: 28, averagePeriodLength: 5, shareWithPartner: false },
  logs: [
    { kind: 'period', value: 'medium', date: '2026-01-01' },
    { kind: 'period', value: 'medium', date: '2026-01-02' },
    { kind: 'period', value: 'medium', date: '2026-01-29' },
    { kind: 'period', value: 'medium', date: '2026-03-05' },
  ],
};

const inferred = inferCycleLength(profile);
assert(inferred.source === 'learned', 'should learn from history');
assert(inferred.length === 32, `expected avg ~32 days, got ${inferred.length}`);

const manualOnly = {
  settings: { averageCycleLength: 30, averagePeriodLength: 5, shareWithPartner: false },
  logs: [{ kind: 'period', value: 'light', date: '2026-03-01' }],
};
assert(inferCycleLength(manualOnly).source === 'settings', 'single period uses setting');
assert(inferCycleLength(manualOnly).length === 30, 'uses manual 30');

console.log('All cycle prediction tests passed.');
