export const Theme = {
  primary: '#8B6FD4',
  primaryDark: '#6B54B8',
  primaryLight: '#EDE7F8',
  secondary: '#A894E0',
  accent: '#C4B0F0',
  background: '#FAF8FF',
  backgroundDark: '#1A1525',
  surface: '#FFFFFF',
  surfaceDark: '#2A2438',
  text: '#2A2438',
  textSecondary: '#8B8399',
  textDark: '#F3F0FA',
  border: '#E8E2F0',
  borderDark: '#3D3550',

  fitness: '#6BAA8A',
  entertainment: '#9B7FD4',
  productivity: '#6B7FD4',
  personalCare: '#B894D4',

  fitnessSubs: {
    general: '#9585B5',
    walk: '#52A878',
    chest: '#E87461',
    back: '#2EC4B6',
    legs: '#4A90D9',
    hike: '#3D9970',
  },
  entertainmentSubs: {
    dates: '#FF6B9D',
    travel: '#45B7D1',
    eating_out: '#F4A442',
  },
  productivitySubs: {
    career: '#6366F1',
    study: '#F59E0B',
  },
  personalCareSubs: {
    hair: '#A855F7',
    face_care: '#EC4899',
    skincare: '#14B8A6',
    other: '#F97316',
  },

  eventColors: [
    '#8B6FD4',
    '#E87461',
    '#45B7D1',
    '#6366F1',
    '#FF6B9D',
    '#14B8A6',
    '#F4A442',
    '#A855F7',
  ],

  /** Uncategorized events — soft lavender for calendar dots. */
  eventNone: '#A894E0',

  /** Who-colors — chosen to avoid category / subcategory palette collisions. */
  participants: {
    together: {
      color: '#E85D8A',
      colorLight: '#FBEEF2',
      colorDark: '#C94A72',
    },
    partner1: {
      color: '#5B7EBD',
      colorLight: '#EEF3FA',
      colorDark: '#3D5F8A',
    },
    partner2: {
      color: '#388659',
      colorLight: '#EDF5EF',
      colorDark: '#276647',
    },
  },

  /** Light fill for timeline event blocks (no category). */
  eventNoneSurface: '#EFECF4',

  love: {
    rose: '#E85D8A',
    roseDark: '#C94A72',
    roseLight: '#FBEEF2',
    blush: '#FF6B9D',
    heart: '#FF4081',
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
