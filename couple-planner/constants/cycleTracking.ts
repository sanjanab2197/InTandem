import { CycleLogKind } from '@/types';
import { isPeriodLogged } from '@/types';

export const CYCLE_THEME = {
  period: '#D96282',
  periodPredicted: 'rgba(217, 98, 130, 0.22)',
  fertile: 'rgba(176, 136, 56, 0.28)',
  ovulation: '#8770C6',
  logDot: '#568A72',
  mood: '#6B9BD1',
  symptom: '#D4924A',
  other: '#8A7A9B',
  accent: '#C06678',
  accentDark: '#A05264',
  accentLight: '#F9EAEE',
  accentMuted: '#FDF6F8',
} as const;

export function cycleLogKindColor(kind: CycleLogKind): string {
  switch (kind) {
    case 'period':
      return CYCLE_THEME.period;
    case 'mood':
      return CYCLE_THEME.mood;
    case 'symptom':
      return CYCLE_THEME.symptom;
    case 'other':
      return CYCLE_THEME.other;
    default:
      return CYCLE_THEME.logDot;
  }
}

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
/** Gap (days) without period logs before the next log starts a new period (Flo-style). */
export const PERIOD_CYCLE_GAP_DAYS = 15;
/** Standard luteal phase — ovulation is this many days before next period. */
export const LUTEAL_PHASE_DAYS = 14;
/** Fertile window: days before ovulation (sperm survival). */
export const FERTILE_DAYS_BEFORE_OVULATION = 5;
/** Fertile window: days after ovulation (egg survival). */
export const FERTILE_DAYS_AFTER_OVULATION = 1;

export const LOG_SECTIONS: {
  kind: CycleLogKind;
  label: string;
  emoji: string;
  options: { key: string; label: string }[];
}[] = [
  {
    kind: 'sex',
    label: 'Sex',
    emoji: '💕',
    options: [
      { key: 'protected', label: 'Protected' },
      { key: 'unprotected', label: 'Unprotected' },
      { key: 'oral', label: 'Oral' },
      { key: 'other', label: 'Other' },
    ],
  },
  {
    kind: 'pill',
    label: 'Pills & meds',
    emoji: '💊',
    options: [
      { key: 'oral_contraceptive', label: 'Oral contraceptive' },
      { key: 'plan_b', label: 'Plan B / emergency' },
      { key: 'pain_relief', label: 'Pain relief' },
      { key: 'iron', label: 'Iron / vitamins' },
      { key: 'antibiotic', label: 'Antibiotic' },
      { key: 'other_pill', label: 'Other pill' },
    ],
  },
  {
    kind: 'discharge',
    label: 'Discharge',
    emoji: '💧',
    options: [
      { key: 'dry', label: 'Dry' },
      { key: 'sticky', label: 'Sticky' },
      { key: 'creamy', label: 'Creamy' },
      { key: 'watery', label: 'Watery' },
      { key: 'egg_white', label: 'Egg-white (fertile)' },
      { key: 'unusual', label: 'Unusual' },
    ],
  },
  {
    kind: 'digestion',
    label: 'Digestion',
    emoji: '🍽',
    options: [
      { key: 'good', label: 'Good' },
      { key: 'bloated', label: 'Bloated' },
      { key: 'nausea', label: 'Nausea' },
      { key: 'heartburn', label: 'Heartburn' },
      { key: 'crampy', label: 'Crampy' },
    ],
  },
  {
    kind: 'stool',
    label: 'Stool',
    emoji: '🚽',
    options: [
      { key: 'normal', label: 'Normal' },
      { key: 'constipated', label: 'Constipated' },
      { key: 'loose', label: 'Loose' },
      { key: 'diarrhea', label: 'Diarrhea' },
    ],
  },
  {
    kind: 'mood',
    label: 'Mood',
    emoji: '🙂',
    options: [
      { key: 'happy', label: 'Happy' },
      { key: 'calm', label: 'Calm' },
      { key: 'anxious', label: 'Anxious' },
      { key: 'irritable', label: 'Irritable' },
      { key: 'sad', label: 'Low / sad' },
      { key: 'energetic', label: 'Energetic' },
    ],
  },
  {
    kind: 'symptom',
    label: 'Symptoms',
    emoji: '🩺',
    options: [
      { key: 'cramps', label: 'Cramps' },
      { key: 'headache', label: 'Headache' },
      { key: 'back_pain', label: 'Back pain' },
      { key: 'breast_tenderness', label: 'Breast tenderness' },
      { key: 'acne', label: 'Acne' },
      { key: 'cravings', label: 'Cravings' },
      { key: 'insomnia', label: 'Insomnia' },
    ],
  },
  {
    kind: 'travel',
    label: 'Travel',
    emoji: '✈️',
    options: [
      { key: 'day_trip', label: 'Day trip' },
      { key: 'vacation', label: 'Vacation' },
      { key: 'timezone', label: 'Timezone change' },
      { key: 'long_flight', label: 'Long flight' },
    ],
  },
  {
    kind: 'sleep',
    label: 'Sleep',
    emoji: '😴',
    options: [
      { key: 'great', label: 'Great' },
      { key: 'okay', label: 'Okay' },
      { key: 'poor', label: 'Poor' },
      { key: 'insomnia', label: 'Insomnia' },
    ],
  },
  {
    kind: 'energy',
    label: 'Energy',
    emoji: '⚡',
    options: [
      { key: 'high', label: 'High' },
      { key: 'normal', label: 'Normal' },
      { key: 'low', label: 'Low' },
      { key: 'exhausted', label: 'Exhausted' },
    ],
  },
  {
    kind: 'skin',
    label: 'Skin',
    emoji: '✨',
    options: [
      { key: 'clear', label: 'Clear' },
      { key: 'oily', label: 'Oily' },
      { key: 'dry', label: 'Dry' },
      { key: 'breakout', label: 'Breakout' },
    ],
  },
];

export function cycleLogKindEmoji(kind: CycleLogKind): string {
  if (kind === 'period') return '';
  if (kind === 'other') return '✏️';
  const section = LOG_SECTIONS.find((s) => s.kind === kind);
  return section?.emoji ?? '•';
}

export function logKindLabel(kind: CycleLogKind): string {
  if (kind === 'period') return 'Period';
  if (kind === 'other') return 'Other';
  const section = LOG_SECTIONS.find((s) => s.kind === kind);
  return section?.label ?? kind;
}

export function logValueLabel(kind: CycleLogKind, value: string, notes?: string): string {
  if (kind === 'other') return notes?.trim() || value || 'Other';
  if (kind === 'period') return isPeriodLogged(value) ? 'On period' : 'Not on period';
  const section = LOG_SECTIONS.find((s) => s.kind === kind);
  return section?.options.find((o) => o.key === value)?.label ?? value;
}
