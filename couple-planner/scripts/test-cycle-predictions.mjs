/**
 * Run: node scripts/test-cycle-predictions.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function inferPeriodEpisodes(profile) {
  const PERIOD_CYCLE_GAP_DAYS = 15;
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
    const gap = daysBetween(current[current.length - 1], d);
    if (gap > PERIOD_CYCLE_GAP_DAYS) {
      episodes.push(current);
      current = [d];
    } else {
      current.push(d);
    }
  }
  if (current.length > 0) episodes.push(current);
  return episodes;
}

function inferPeriodEpisodeSpan(episode) {
  if (episode.length === 0) return 0;
  if (episode.length === 1) return 1;
  return daysBetween(episode[0], episode[episode.length - 1]) + 1;
}

function inferTypicalPeriodLength(profile) {
  const episodes = inferPeriodEpisodes(profile);
  if (episodes.length === 0) return profile.settings.averagePeriodLength || 5;
  const spans = episodes.map(inferPeriodEpisodeSpan);
  const recent = spans.slice(-3);
  return Math.round(recent.reduce((sum, n) => sum + n, 0) / recent.length);
}

function inferPeriodStarts(profile) {
  const starts = inferPeriodEpisodes(profile).map((episode) => episode[0]);
  if (starts.length === 0 && profile.settings.lastPeriodStart) {
    return [profile.settings.lastPeriodStart];
  }
  return starts;
}

function inferCycleLength(profile) {
  const starts = inferPeriodStarts(profile);
  const gaps = [];
  for (let i = 1; i < starts.length; i += 1) {
    const gap = daysBetween(starts[i - 1], starts[i]);
    if (gap >= 21 && gap <= 45) gaps.push(gap);
  }
  if (gaps.length >= 1 && profile.settings.useManualCycleLength !== true) {
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

const manualOverride = {
  settings: {
    averageCycleLength: 26,
    averagePeriodLength: 4,
    shareWithPartner: false,
    useManualCycleLength: true,
  },
  logs: profile.logs,
};
assert(inferCycleLength(manualOverride).source === 'settings', 'manual flag overrides learned');
assert(inferCycleLength(manualOverride).length === 26, 'uses saved manual length');

const sparsePeriod = {
  settings: { averageCycleLength: 28, averagePeriodLength: 5, shareWithPartner: false },
  logs: [
    { kind: 'period', value: 'yes', date: '2026-06-01' },
    { kind: 'period', value: 'yes', date: '2026-06-03' },
    { kind: 'period', value: 'yes', date: '2026-06-05' },
  ],
};
const sparseEpisodes = inferPeriodEpisodes(sparsePeriod);
assert(sparseEpisodes.length === 1, 'sparse days in one period stay one cluster');
assert(inferPeriodEpisodeSpan(sparseEpisodes[0]) === 5, 'period span is first to last logged day');
assert(inferTypicalPeriodLength(sparsePeriod) === 5, 'predictions use calendar span like Flo');

const threeDayRun = {
  settings: { averageCycleLength: 28, averagePeriodLength: 5, shareWithPartner: false },
  logs: [
    { kind: 'period', value: 'yes', date: '2026-06-01' },
    { kind: 'period', value: 'yes', date: '2026-06-02' },
    { kind: 'period', value: 'yes', date: '2026-06-03' },
  ],
};
assert(inferPeriodEpisodes(threeDayRun)[0].length === 3, 'all logged days stay in one cluster');
assert(inferTypicalPeriodLength(threeDayRun) === 3, 'tight consecutive logs use span');

const LUTEAL = 14;
const FERTILE_BEFORE = 5;
const FERTILE_AFTER = 1;

function computePredictions(profile, todayStr) {
  const cycleLength = inferCycleLength(profile).length;
  const starts = inferPeriodStarts(profile);
  const lastPeriodStart = starts[starts.length - 1];
  if (!lastPeriodStart) return null;

  const today = new Date(todayStr);
  let next = new Date(lastPeriodStart);
  next.setDate(next.getDate() + cycleLength);
  while (next <= today) {
    next.setDate(next.getDate() + cycleLength);
  }
  const ovulation = new Date(next);
  ovulation.setDate(ovulation.getDate() - LUTEAL);
  const fertileStart = new Date(ovulation);
  fertileStart.setDate(fertileStart.getDate() - FERTILE_BEFORE);
  const fertileEnd = new Date(ovulation);
  fertileEnd.setDate(fertileEnd.getDate() + FERTILE_AFTER);

  const fmt = (d) => d.toISOString().slice(0, 10);
  return {
    lastPeriodStart,
    nextPeriodStart: fmt(next),
    ovulationDate: fmt(ovulation),
    fertileStart: fmt(fertileStart),
    fertileEnd: fmt(fertileEnd),
    cycleLength,
  };
}

const floProfile = {
  settings: { averageCycleLength: 28, averagePeriodLength: 5, shareWithPartner: false },
  logs: [{ kind: 'period', value: 'yes', date: '2026-01-01' }],
};
const floPred = computePredictions(floProfile, '2026-01-20');
assert(floPred.nextPeriodStart === '2026-01-29', 'next period is last start + cycle length');
assert(floPred.ovulationDate === '2026-01-15', 'ovulation is 14 days before next period');
assert(floPred.fertileStart === '2026-01-10', 'fertile window starts 5 days before ovulation');
assert(floPred.fertileEnd === '2026-01-16', 'fertile window ends 1 day after ovulation');

const lateProfile = {
  settings: { averageCycleLength: 28, averagePeriodLength: 5, shareWithPartner: false },
  logs: [{ kind: 'period', value: 'yes', date: '2026-01-01' }],
};
const latePred = computePredictions(lateProfile, '2026-02-10');
assert(latePred.nextPeriodStart === '2026-02-26', 'late cycle advances to next future period');
assert(latePred.ovulationDate === '2026-02-12', 'ovulation tracks the upcoming period');

console.log('All cycle prediction tests passed.');
