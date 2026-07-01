import { PlanCategory } from '@/types';

export interface PlanCategoryTheme {
  accent: string;
  accentDark: string;
  accentLight: string;
  accentMuted: string;
}

export const PLAN_CATEGORY_THEMES: Record<PlanCategory, PlanCategoryTheme> = {
  weekly_checklist: {
    accent: '#8B6FD4',
    accentDark: '#6B54B8',
    accentLight: '#EDE7F8',
    accentMuted: '#F8F5FF',
  },
  date_ideas: {
    accent: '#D17A94',
    accentDark: '#B55F78',
    accentLight: '#FBEEF2',
    accentMuted: '#FFF8FA',
  },
  travel_ideas: {
    accent: '#5B8DEF',
    accentDark: '#456FD4',
    accentLight: '#EAF1FE',
    accentMuted: '#F5F9FF',
  },
  enrichment_ideas: {
    accent: '#C4923A',
    accentDark: '#9E7428',
    accentLight: '#FBF3E3',
    accentMuted: '#FFFCF6',
  },
  reminders: {
    accent: '#C4845A',
    accentDark: '#9A6340',
    accentLight: '#F5E8DC',
    accentMuted: '#FBF6F1',
  },
  expenseflow: {
    accent: '#5A9A7A',
    accentDark: '#3D7A5E',
    accentLight: '#E5F2EC',
    accentMuted: '#F4FAF7',
  },
};

export function getPlanTheme(category: PlanCategory): PlanCategoryTheme {
  return PLAN_CATEGORY_THEMES[category];
}

export const PlansUI = {
  delete: '#E07A7A',
  deleteLight: '#FDF0F0',
  owe: '#C45E48',
  oweDark: '#9A4538',
  oweLight: '#FDEEEA',
  credit: '#4A9468',
  creditDark: '#3D7A5E',
  creditLight: '#E8F5EE',
  cardShadow: {
    shadowColor: '#3D3550',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};
