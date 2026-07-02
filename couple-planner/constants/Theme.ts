export const Theme = {
  primary: '#8770C6',
  primaryDark: '#6652A8',
  primaryLight: '#EBE6F4',
  secondary: '#A08EB8',
  accent: '#BFB0D8',
  background: '#F8F6FA',
  backgroundDark: '#1B1724',
  surface: '#FFFFFF',
  surfaceDark: '#2B2536',
  text: '#2C2735',
  textSecondary: '#857D90',
  textDark: '#F2EFF6',
  border: '#E5DFEB',
  borderDark: '#3A3448',

  fitness: '#65967D',
  entertainment: '#9478C2',
  productivity: '#6878BE',
  personalCare: '#AE8FC4',

  fitnessSubs: {
    general: '#8F82A8',
    walk: '#4F986F',
    chest: '#D97262',
    back: '#3AAB9E',
    legs: '#4A82B8',
    hike: '#3F8566',
  },
  entertainmentSubs: {
    dates: '#D47892',
    travel: '#4A9BB0',
    eating_out: '#C99548',
  },
  productivitySubs: {
    career: '#5D61C4',
    study: '#C4903A',
  },
  personalCareSubs: {
    hair: '#9171B8',
    face_care: '#C86E88',
    skincare: '#449E90',
    other: '#C97A42',
  },

  eventColors: [
    '#8770C6',
    '#D97262',
    '#4A9BB0',
    '#5D61C4',
    '#D47892',
    '#449E90',
    '#C99548',
    '#9171B8',
  ],

  /** Uncategorized events — soft lavender for calendar dots. */
  eventNone: '#A08EB8',

  /** Who-colors — chosen to avoid category / subcategory palette collisions. */
  participants: {
    together: {
      color: '#D96282',
      colorLight: '#FAEDF0',
      colorDark: '#B8506C',
    },
    partner1: {
      color: '#5678AD',
      colorLight: '#EDF0F6',
      colorDark: '#3E5F82',
    },
    partner2: {
      color: '#3A7D55',
      colorLight: '#ECF2ED',
      colorDark: '#286644',
    },
  },

  /** Light fill for timeline event blocks (no category). */
  eventNoneSurface: '#EEEBF2',

  love: {
    rose: '#D96282',
    roseDark: '#B8506C',
    roseLight: '#FAEDF0',
    blush: '#CF7894',
    heart: '#D45A78',
  },
};

export const CATEGORY_LABELS = {
  fitness: 'Fitness',
  entertainment: 'Entertainment',
  productivity: 'Productivity',
  personal_care: 'Personal Care',
} as const;

export const SUBCATEGORY_LABELS: Record<string, Record<string, string>> = {
  fitness: { general: 'General', walk: 'Walk', chest: 'Chest', back: 'Back', legs: 'Legs', hike: 'Hike' },
  entertainment: { dates: 'Dates', travel: 'Travel', eating_out: 'Eating Out / Takeout' },
  productivity: { career: 'Career / Work', study: 'Study' },
  personal_care: { hair: 'Hair', face_care: 'Face Care', skincare: 'Skincare', other: 'Other' },
};

export const PLAN_CATEGORIES = [
  { key: 'weekly_checklist', label: 'Checklist', icon: 'checkmark.circle' },
  { key: 'date_ideas', label: 'Date Ideas', icon: 'heart' },
  { key: 'travel_ideas', label: 'Travel Ideas', icon: 'airplane' },
  { key: 'enrichment_ideas', label: 'Enrichment Ideas', icon: 'lightbulb' },
  { key: 'reminders', label: 'Reminders', icon: 'bell' },
  { key: 'key_dates', label: 'Key Dates', icon: 'gift' },
  { key: 'ai_agent', label: 'AI Agent', icon: 'sparkles' },
  { key: 'ai_meal', label: 'AI Meal', icon: 'fork.knife' },
  { key: 'expenseflow', label: 'Expenseflow', icon: 'dollarsign.circle' },
] as const;
