import { PlanCategory, PlanSubcategoriesByCategory, PlanSubcategory } from '@/types';

export interface PlanSubcategoryOption {
  key: string;
  label: string;
}

type PlanCategoryWithSubcategories = Exclude<
  PlanCategory,
  'reminders' | 'expenseflow' | 'key_dates' | 'ai_agent' | 'ai_meal'
>;

export const PLAN_CATEGORY_KEYS: PlanCategoryWithSubcategories[] = [
  'weekly_checklist',
  'date_ideas',
  'travel_ideas',
  'enrichment_ideas',
];

export const PLAN_SUBCATEGORIES: Record<PlanCategoryWithSubcategories, PlanSubcategoryOption[]> = {
  weekly_checklist: [
    { key: 'chores', label: 'Chores' },
    { key: 'errands', label: 'Errands' },
    { key: 'groceries', label: 'Groceries' },
    { key: 'home', label: 'Home Improvements' },
    { key: 'meals', label: 'Meals' },
  ],
  date_ideas: [
    { key: 'restaurants', label: 'Restaurants' },
    { key: 'adventure', label: 'Adventure / Outdoor' },
    { key: 'entertainment', label: 'Movies & Entertainment' },
    { key: 'cozy', label: 'At-home / Cozy' },
    { key: 'seasonal', label: 'Seasonal / Special' },
  ],
  travel_ideas: [
    { key: 'places', label: 'Itinerary' },
    { key: 'dining', label: 'Restaurants & Food' },
    { key: 'nightlife', label: 'Bars & Nightlife' },
    { key: 'stays', label: 'Where to Stay' },
    { key: 'packing', label: 'Weather & Packing' },
    { key: 'logistics', label: 'Logistics' },
    { key: 'budget', label: 'Budget & Tips' },
  ],
  enrichment_ideas: [
    { key: 'books', label: 'Books & Reading' },
    { key: 'courses', label: 'Courses & Learning' },
    { key: 'hobbies', label: 'Hobbies' },
    { key: 'wellness', label: 'Wellness & Growth' },
  ],
};

/** Old preset checklist tabs removed from defaults — filtered out on merge. */
export const LEGACY_WEEKLY_CHECKLIST_KEYS = new Set(['together', 'admin']);

export function initPlanSubcategories(): PlanSubcategoriesByCategory {
  return Object.fromEntries(
    PLAN_CATEGORY_KEYS.map((cat) => [
      cat,
      PLAN_SUBCATEGORIES[cat].map((s) => ({ ...s, builtIn: true })),
    ])
  ) as PlanSubcategoriesByCategory;
}

function mergeSubcategoryList(
  stored: PlanSubcategory[],
  defaults: PlanSubcategoryOption[]
): PlanSubcategory[] {
  const map = new Map<string, PlanSubcategory>();
  for (const sub of defaults) map.set(sub.key, { ...sub, builtIn: true });
  for (const sub of stored) map.set(sub.key, { ...sub });

  const order = [
    ...defaults.map((s) => s.key),
    ...stored.map((s) => s.key).filter((key) => !defaults.some((d) => d.key === key)),
  ];
  const seen = new Set<string>();
  return order
    .filter((key) => {
      if (seen.has(key) || !map.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((key) => map.get(key)!);
}

export function mergePlanSubcategories(
  stored?: PlanSubcategoriesByCategory
): PlanSubcategoriesByCategory {
  if (!stored) {
    return initPlanSubcategories();
  }

  const merged = {} as PlanSubcategoriesByCategory;
  for (const category of PLAN_CATEGORY_KEYS) {
    const defaults = PLAN_SUBCATEGORIES[category];
    if (stored[category] !== undefined) {
      let list = mergeSubcategoryList(stored[category], defaults);
      if (category === 'weekly_checklist') {
        list = list.filter((s) => !LEGACY_WEEKLY_CHECKLIST_KEYS.has(s.key));
        list = list.map((s) =>
          s.key === 'home' && s.label === 'Home' ? { ...s, label: 'Home Improvements' } : s
        );
        list.sort((a, b) => a.label.localeCompare(b.label));
      }
      merged[category] = list;
    } else {
      merged[category] = defaults.map((s) => ({ ...s, builtIn: true }));
    }
  }
  return merged;
}

export function getSubcategoriesForCategory(
  category: PlanCategory,
  all: PlanSubcategoriesByCategory
): PlanSubcategory[] {
  if (category === 'reminders' || category === 'expenseflow' || category === 'key_dates' || category === 'ai_agent' || category === 'ai_meal') return [];
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
  if (category === 'reminders' || category === 'expenseflow' || category === 'key_dates' || category === 'ai_agent' || category === 'ai_meal') return 'general';
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
