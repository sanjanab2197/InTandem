import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '@/constants/cycleTracking';
import { CycleCalendarMarker, CycleDayPhase, CycleLogEntry, CycleProfile, FlowLevel } from '@/types';

function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function parseDate(dateStr: string): Date {
  return parseISO(dateStr);
}

/** First day of each logged bleeding episode (gap > 1 day between flow logs). */
export function inferPeriodStarts(profile: CycleProfile): string[] {
  const periodDates = profile.logs
    .filter((l) => l.kind === 'period' && l.value && l.value !== 'none')
    .map((l) => l.date)
    .sort();

  const starts: string[] = [];
  for (let i = 0; i < periodDates.length; i += 1) {
    if (i === 0) {
      starts.push(periodDates[0]);
      continue;
    }
    const gap = differenceInCalendarDays(parseDate(periodDates[i]), parseDate(periodDates[i - 1]));
    if (gap > 1) starts.push(periodDates[i]);
  }

  if (profile.settings.lastPeriodStart && !starts.includes(profile.settings.lastPeriodStart)) {
    starts.push(profile.settings.lastPeriodStart);
  }

  return [...new Set(starts)].sort();
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

  if (gaps.length >= 1) {
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
  const periodLength = profile.settings.averagePeriodLength || DEFAULT_PERIOD_LENGTH;
  const lastPeriodStart = inferLastPeriodStart(profile);

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

  return {
    lastPeriodStart: currentCycleStart,
    nextPeriodStart,
    ovulationDate,
    fertileStart,
    fertileEnd,
    cycleLength,
    cycleLengthSource,
    cyclesUsedForLength,
    periodLength,
  };
}

function isInRange(dateStr: string, start: string, end: string): boolean {
  const d = parseDate(dateStr).getTime();
  return d >= parseDate(start).getTime() && d <= parseDate(end).getTime();
}

function periodDaysFromLogs(logs: CycleLogEntry[]): Set<string> {
  const set = new Set<string>();
  for (const log of logs) {
    if (log.kind === 'period' && log.value && log.value !== 'none') {
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
    } else if (predictions.lastPeriodStart && predictions.periodLength) {
      const periodEnd = dateKey(
        addDays(parseDate(predictions.lastPeriodStart), predictions.periodLength - 1)
      );
      if (isInRange(key, predictions.lastPeriodStart, periodEnd)) {
        phase = 'predicted_period';
      }
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
    const flowLog = dayLogs.find((l) => l.kind === 'period');
    const flowValue = flowLog?.value;
    const flow =
      flowValue && flowValue !== 'none' ? (flowValue as FlowLevel) : undefined;
    const logKinds = [...new Set(dayLogs.map((l) => l.kind))];

    if (phase || loggedDates.has(key) || dayLogs.length > 0) {
      markers[key] = {
        phase,
        hasLogs: dayLogs.length > 0,
        flow,
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
