import { PlanCategory, PlanSubcategoriesByCategory, PlanSubcategory } from '@/types';

export interface PlanSubcategoryOption {
  key: string;
  label: string;
}

type PlanCategoryWithSubcategories = Exclude<PlanCategory, 'reminders' | 'expenseflow'>;

export const PLAN_CATEGORY_KEYS: PlanCategoryWithSubcategories[] = [
  'weekly_checklist',
  'date_ideas',
  'travel_ideas',
  'enrichment_ideas',
];

export const PLAN_SUBCATEGORIES: Record<PlanCategoryWithSubcategories, PlanSubcategoryOption[]> = {
  weekly_checklist: [
    { key: 'chores', label: 'Chores & Home' },
    { key: 'meals', label: 'Meals & Groceries' },
    { key: 'together', label: 'Together Time' },
    { key: 'admin', label: 'Errands & Admin' },
  ],
  date_ideas: [
    { key: 'restaurants', label: 'Restaurants' },
    { key: 'adventure', label: 'Adventure / Outdoor' },
    { key: 'entertainment', label: 'Movies & Entertainment' },
    { key: 'cozy', label: 'At-home / Cozy' },
    { key: 'seasonal', label: 'Seasonal / Special' },
  ],
  travel_ideas: [
    { key: 'packing', label: 'Packing Checklist' },
    { key: 'places', label: 'Places to Visit' },
    { key: 'itinerary', label: 'Itinerary' },
    { key: 'budget', label: 'Budget Notes' },
  ],
  enrichment_ideas: [
    { key: 'books', label: 'Books & Reading' },
    { key: 'courses', label: 'Courses & Learning' },
    { key: 'hobbies', label: 'Hobbies' },
    { key: 'wellness', label: 'Wellness & Growth' },
  ],
};

export function initPlanSubcategories(): PlanSubcategoriesByCategory {
  return Object.fromEntries(
    PLAN_CATEGORY_KEYS.map((cat) => [
      cat,
      PLAN_SUBCATEGORIES[cat].map((s) => ({ ...s, builtIn: true })),
    ])
  ) as PlanSubcategoriesByCategory;
}

export function mergePlanSubcategories(
  stored?: PlanSubcategoriesByCategory
): PlanSubcategoriesByCategory {
  if (!stored) {
    return initPlanSubcategories();
  }

  const merged = {} as PlanSubcategoriesByCategory;
  for (const category of PLAN_CATEGORY_KEYS) {
    if (stored[category] !== undefined) {
      merged[category] = stored[category].map((s) => ({ ...s }));
    } else {
      merged[category] = PLAN_SUBCATEGORIES[category].map((s) => ({ ...s, builtIn: true }));
    }
  }
  return merged;
}

export function getSubcategoriesForCategory(
  category: PlanCategory,
  all: PlanSubcategoriesByCategory
): PlanSubcategory[] {
  if (category === 'reminders' || category === 'expenseflow') return [];
  if (all[category] !== undefined) {
    return all[category];
  }
  return PLAN_SUBCATEGORIES[category].map((s) => ({ ...s, builtIn: true }));
}

export function getSubcategoryLabel(
  category: PlanCategory,
  key: string | undefined,
  all: PlanSubcategoriesByCategory
): string | undefined {
  if (!key) return undefined;
  return getSubcategoriesForCategory(category, all).find((s) => s.key === key)?.label;
}

export function defaultSubcategory(
  category: PlanCategory,
  all: PlanSubcategoriesByCategory
): string {
  if (category === 'reminders' || category === 'expenseflow') return 'general';
  return getSubcategoriesForCategory(category, all)[0]?.key ?? 'general';
}

export function slugifySubcategoryKey(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  return base || 'custom';
}

export function uniqueSubcategoryKey(
  label: string,
  existing: PlanSubcategory[]
): string {
  const taken = new Set(existing.map((s) => s.key));
  let key = slugifySubcategoryKey(label);
  let i = 2;
  while (taken.has(key)) {
    key = `${slugifySubcategoryKey(label)}_${i++}`;
  }
  return key;
}

export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

export function formatTags(tags?: string[]): string {
  return tags?.join(', ') ?? '';
}
