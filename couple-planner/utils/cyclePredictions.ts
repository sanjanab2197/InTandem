import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH, PERIOD_CYCLE_GAP_DAYS } from '@/constants/cycleTracking';
import { CycleCalendarMarker, CycleDayPhase, CycleLogEntry, CycleProfile, isPeriodLogged } from '@/types';

function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function parseDate(dateStr: string): Date {
  return parseISO(dateStr);
}

/** Flo-style: one period per cluster; sparse logged days in between still belong to the same period. */
export function inferPeriodEpisodes(profile: CycleProfile): string[][] {
  const dates = profile.logs
    .filter((l) => l.kind === 'period' && isPeriodLogged(l.value))
    .map((l) => l.date)
    .sort();

  const episodes: string[][] = [];
  let current: string[] = [];

  for (const d of dates) {
    if (current.length === 0) {
      current = [d];
      continue;
    }
    const gap = differenceInCalendarDays(parseDate(d), parseDate(current[current.length - 1]));
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

/** Calendar span from first to last logged day in a period cluster. */
export function inferPeriodEpisodeSpan(episode: string[]): number {
  if (episode.length === 0) return 0;
  if (episode.length === 1) return 1;
  return differenceInCalendarDays(parseDate(episode[episode.length - 1]), parseDate(episode[0])) + 1;
}

export function inferLatestPeriodEpisode(profile: CycleProfile): string[] | undefined {
  const episodes = inferPeriodEpisodes(profile);
  if (episodes.length === 0) return undefined;
  return episodes[episodes.length - 1];
}

/** Learned period length from first→last logged day per period (Flo-style). */
export function inferTypicalPeriodLength(profile: CycleProfile): number {
  const episodes = inferPeriodEpisodes(profile);
  if (episodes.length === 0) {
    return profile.settings.averagePeriodLength || DEFAULT_PERIOD_LENGTH;
  }
  const spans = episodes.map(inferPeriodEpisodeSpan);
  const recent = spans.slice(-3);
  const avg = Math.round(recent.reduce((sum, n) => sum + n, 0) / recent.length);
  return Math.min(Math.max(avg, 1), 14);
}

/** First logged day of each period cluster. */
export function inferPeriodStarts(profile: CycleProfile): string[] {
  const starts = inferPeriodEpisodes(profile).map((episode) => episode[0]);
  if (starts.length === 0 && profile.settings.lastPeriodStart) {
    return [profile.settings.lastPeriodStart];
  }
  return starts;
}

export function inferLatestPeriodEpisodeStart(profile: CycleProfile): string | undefined {
  const episodes = inferPeriodEpisodes(profile);
  if (episodes.length === 0) return profile.settings.lastPeriodStart;
  return episodes[episodes.length - 1][0];
}

export function inferLastPeriodStart(profile: CycleProfile): string | undefined {
  const starts = inferPeriodStarts(profile);
  if (starts.length === 0) return undefined;
  return starts[starts.length - 1];
}

export type CycleLengthSource = 'learned' | 'settings' | 'default';

export interface InferredCycleLength {
  length: number;
  source: CycleLengthSource;
  /** Number of complete cycles used when source is learned. */
  cyclesUsed: number;
}

/** Rolling average of gaps between logged period starts (21–45 days). */
export function inferCycleLength(profile: CycleProfile): InferredCycleLength {
  const starts = inferPeriodStarts(profile);
  const gaps: number[] = [];

  for (let i = 1; i < starts.length; i += 1) {
    const gap = differenceInCalendarDays(parseDate(starts[i]), parseDate(starts[i - 1]));
    if (gap >= 21 && gap <= 45) gaps.push(gap);
  }

  if (gaps.length >= 1 && profile.settings.useManualCycleLength !== true) {
    const recent = gaps.slice(-6);
    const avg = Math.round(recent.reduce((sum, g) => sum + g, 0) / recent.length);
    return { length: avg, source: 'learned', cyclesUsed: recent.length + 1 };
  }

  const fromSettings = profile.settings.averageCycleLength;
  if (fromSettings && fromSettings >= 21 && fromSettings <= 45) {
    return { length: fromSettings, source: 'settings', cyclesUsed: 0 };
  }

  return { length: DEFAULT_CYCLE_LENGTH, source: 'default', cyclesUsed: 0 };
}

export interface CyclePredictions {
  lastPeriodStart?: string;
  nextPeriodStart?: string;
  ovulationDate?: string;
  fertileStart?: string;
  fertileEnd?: string;
  cycleLength: number;
  cycleLengthSource: CycleLengthSource;
  cyclesUsedForLength: number;
  periodLength: number;
}

export function cycleLengthLabel(predictions: CyclePredictions): string {
  if (predictions.cycleLengthSource === 'learned') {
    const n = predictions.cyclesUsedForLength;
    return `${predictions.cycleLength}-day cycle · from your last ${n} period${n === 1 ? '' : 's'}`;
  }
  if (predictions.cycleLengthSource === 'settings') {
    return `${predictions.cycleLength}-day cycle · your setting`;
  }
  return `${predictions.cycleLength}-day cycle · log periods to personalize`;
}

export function computeCyclePredictions(profile: CycleProfile): CyclePredictions {
  const { length: cycleLength, source: cycleLengthSource, cyclesUsed: cyclesUsedForLength } =
    inferCycleLength(profile);
  const periodLength = inferTypicalPeriodLength(profile);
  const lastPeriodStart = inferLastPeriodStart(profile);
  const latestEpisode = inferLatestPeriodEpisode(profile);

  if (!lastPeriodStart) {
    return { cycleLength, cycleLengthSource, cyclesUsedForLength, periodLength };
  }

  const anchor = parseDate(lastPeriodStart);
  const today = new Date();
  let cursor = anchor;

  while (addDays(cursor, cycleLength) <= today) {
    cursor = addDays(cursor, cycleLength);
  }

  const currentCycleStart = dateKey(cursor);
  const nextPeriodStart = dateKey(addDays(cursor, cycleLength));
  const ovulationDate = dateKey(addDays(cursor, Math.max(cycleLength - 14, Math.floor(cycleLength / 2))));
  const fertileStart = dateKey(addDays(parseDate(ovulationDate), -5));
  const fertileEnd = dateKey(addDays(parseDate(ovulationDate), 1));

  const latestSpan = latestEpisode ? inferPeriodEpisodeSpan(latestEpisode) : periodLength;
  const lastLogged = latestEpisode?.[latestEpisode.length - 1];
  const daysSinceLastLog =
    lastLogged != null ? differenceInCalendarDays(today, parseDate(lastLogged)) : null;
  const activePeriodLength =
    latestEpisode &&
    latestEpisode[0] === lastPeriodStart &&
    daysSinceLastLog != null &&
    daysSinceLastLog <= PERIOD_CYCLE_GAP_DAYS
      ? latestSpan
      : periodLength;

  return {
    lastPeriodStart: currentCycleStart,
    nextPeriodStart,
    ovulationDate,
    fertileStart,
    fertileEnd,
    cycleLength,
    cycleLengthSource,
    cyclesUsedForLength,
    periodLength: activePeriodLength,
  };
}

function isInRange(dateStr: string, start: string, end: string): boolean {
  const d = parseDate(dateStr).getTime();
  return d >= parseDate(start).getTime() && d <= parseDate(end).getTime();
}

function periodDaysFromLogs(logs: CycleLogEntry[]): Set<string> {
  const set = new Set<string>();
  for (const log of logs) {
    if (log.kind === 'period' && isPeriodLogged(log.value)) {
      set.add(log.date);
    }
  }
  return set;
}

export function buildCycleCalendarMarkers(
  profile: CycleProfile,
  monthStart: Date,
  monthEnd: Date
): Record<string, CycleCalendarMarker> {
  const predictions = computeCyclePredictions(profile);
  const markers: Record<string, CycleCalendarMarker> = {};
  const loggedDates = new Set(profile.logs.map((l) => l.date));
  const periodLogged = periodDaysFromLogs(profile.logs);

  const start = monthStart;
  const end = monthEnd;
  let day = start;
  while (day <= end) {
    const key = dateKey(day);
    let phase: CycleDayPhase | undefined;

    if (periodLogged.has(key)) {
      phase = 'period';
    }

    if (!phase && predictions.nextPeriodStart && predictions.periodLength) {
      const predEnd = dateKey(
        addDays(parseDate(predictions.nextPeriodStart), predictions.periodLength - 1)
      );
      if (isInRange(key, predictions.nextPeriodStart, predEnd)) {
        phase = 'predicted_period';
      }
    }

    if (!phase && predictions.ovulationDate && key === predictions.ovulationDate) {
      phase = 'ovulation';
    }

    if (
      !phase &&
      predictions.fertileStart &&
      predictions.fertileEnd &&
      isInRange(key, predictions.fertileStart, predictions.fertileEnd)
    ) {
      phase = 'fertile';
    }

    const dayLogs = profile.logs.filter((l) => l.date === key);
    const logKinds = [...new Set(dayLogs.map((l) => l.kind))];

    if (phase || loggedDates.has(key) || dayLogs.length > 0) {
      markers[key] = {
        phase,
        hasLogs: dayLogs.length > 0,
        logKinds,
        logCount: dayLogs.length,
      };
    }

    day = addDays(day, 1);
  }

  return markers;
}

export function formatPredictionDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return format(parseISO(dateStr), 'MMM d');
}

export function daysUntil(dateStr: string | undefined, from = new Date()): number | null {
  if (!dateStr) return null;
  return differenceInCalendarDays(parseISO(dateStr), from);
}

export function cycleHeadline(predictions: CyclePredictions, from = new Date()): string {
  const ovulationDays = daysUntil(predictions.ovulationDate, from);
  if (ovulationDays === 0) return 'Ovulation day';
  if (ovulationDays === 1) return 'Ovulation tomorrow';

  const periodDays = daysUntil(predictions.nextPeriodStart, from);
  if (periodDays === 0) return 'Period expected today';
  if (periodDays === 1) return 'Period expected tomorrow';
  if (periodDays !== null && periodDays > 0 && periodDays <= 14) {
    return `Period in ${periodDays} days`;
  }

  const fertileDays = daysUntil(predictions.fertileStart, from);
  if (fertileDays === 0) return 'Fertile window starts today';
  if (fertileDays !== null && fertileDays > 0 && fertileDays <= 5) {
    return `Fertile window in ${fertileDays} days`;
  }

  return 'Log your period to improve predictions';
}
