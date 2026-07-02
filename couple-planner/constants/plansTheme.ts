import { PlanCategory } from '@/types';

export interface PlanCategoryTheme {
  accent: string;
  accentDark: string;
  accentLight: string;
  accentMuted: string;
}

export const PLAN_CATEGORY_THEMES: Record<PlanCategory, PlanCategoryTheme> = {
  weekly_checklist: {
    accent: '#8770C6',
    accentDark: '#6652A8',
    accentLight: '#EBE6F4',
    accentMuted: '#F5F3F9',
  },
  date_ideas: {
    accent: '#CF7D90',
    accentDark: '#AD6475',
    accentLight: '#FAEDF0',
    accentMuted: '#FDF8F9',
  },
  travel_ideas: {
    accent: '#5282CC',
    accentDark: '#3F68AD',
    accentLight: '#E8EEF6',
    accentMuted: '#F2F6FA',
  },
  enrichment_ideas: {
    accent: '#B88838',
    accentDark: '#966F28',
    accentLight: '#F7F0E4',
    accentMuted: '#FBF8F2',
  },
  reminders: {
    accent: '#B87D58',
    accentDark: '#946340',
    accentLight: '#F3E9DF',
    accentMuted: '#F9F4EE',
  },
  key_dates: {
    accent: '#C06678',
    accentDark: '#A05264',
    accentLight: '#F9EAEE',
    accentMuted: '#FDF6F8',
  },
  ai_agent: {
    accent: '#7968BD',
    accentDark: '#5E4FA0',
    accentLight: '#EBE7F5',
    accentMuted: '#F4F2F9',
  },
  ai_meal: {
    accent: '#C0883A',
    accentDark: '#A06E28',
    accentLight: '#F6EBD8',
    accentMuted: '#FBF6EE',
  },
  expenseflow: {
    accent: '#568A72',
    accentDark: '#3E7058',
    accentLight: '#E3EFE8',
    accentMuted: '#F1F7F4',
  },
};

export function getPlanTheme(category: PlanCategory): PlanCategoryTheme {
  return PLAN_CATEGORY_THEMES[category];
}

export const PlansUI = {
  delete: '#D47878',
  deleteLight: '#FBF0F0',
  owe: '#B85A48',
  oweDark: '#944838',
  oweLight: '#FCEEEA',
  credit: '#468A66',
  creditDark: '#3A7058',
  creditLight: '#E6F0EA',
  cardShadow: {
    shadowColor: '#3A3448',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};
