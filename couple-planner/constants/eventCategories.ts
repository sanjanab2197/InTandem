import { Theme } from '@/constants/Theme';
import { CalendarEvent, CategoryGoals, EventCategoryConfig, EventSubcategoryConfig } from '@/types';
import { mixHex } from '@/utils/colorMix';

const SUB_COLOR_PALETTE = [
  '#E87461',
  '#2EC4B6',
  '#4A90D9',
  '#3D9970',
  '#FF6B9D',
  '#45B7D1',
  '#F4A442',
  '#6366F1',
  '#F59E0B',
  '#A855F7',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

export const DEFAULT_EVENT_CATEGORIES: EventCategoryConfig[] = [
  {
    key: 'fitness',
    label: 'Fitness',
    color: Theme.fitness,
    builtIn: true,
    subcategories: [
      { key: 'general', label: 'General', color: Theme.fitnessSubs.general, builtIn: true },
      { key: 'walk', label: 'Walk', color: Theme.fitnessSubs.walk, builtIn: true },
      { key: 'chest', label: 'Chest', color: Theme.fitnessSubs.chest, builtIn: true },
      { key: 'back', label: 'Back', color: Theme.fitnessSubs.back, builtIn: true },
      { key: 'legs', label: 'Legs', color: Theme.fitnessSubs.legs, builtIn: true },
      { key: 'hike', label: 'Hike', color: Theme.fitnessSubs.hike, builtIn: true },
    ],
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    color: Theme.entertainment,
    builtIn: true,
    subcategories: [
      { key: 'dates', label: 'Dates', color: Theme.entertainmentSubs.dates, builtIn: true },
      { key: 'travel', label: 'Travel', color: Theme.entertainmentSubs.travel, builtIn: true },
      {
        key: 'eating_out',
        label: 'Eating Out / Takeout',
        color: Theme.entertainmentSubs.eating_out,
        builtIn: true,
      },
    ],
  },
  {
    key: 'productivity',
    label: 'Productivity',
    color: Theme.productivity,
    builtIn: true,
    subcategories: [
      { key: 'career', label: 'Career / Work', color: Theme.productivitySubs.career, builtIn: true },
      { key: 'study', label: 'Study', color: Theme.productivitySubs.study, builtIn: true },
    ],
  },
  {
    key: 'personal_care',
    label: 'Personal Care',
    color: Theme.personalCare,
    builtIn: true,
    subcategories: [
      { key: 'hair', label: 'Hair', color: Theme.personalCareSubs.hair, builtIn: true },
      { key: 'face_care', label: 'Face Care', color: Theme.personalCareSubs.face_care, builtIn: true },
      { key: 'skincare', label: 'Skincare', color: Theme.personalCareSubs.skincare, builtIn: true },
      { key: 'other', label: 'Other', color: Theme.personalCareSubs.other, builtIn: true },
    ],
  },
];

export const DEFAULT_WEEKLY_GOALS: CategoryGoals = {
  fitness: 3,
  entertainment: 2,
  productivity: 5,
  personal_care: 2,
};

export function initEventCategories(): EventCategoryConfig[] {
  return DEFAULT_EVENT_CATEGORIES.map((cat) => ({
    ...cat,
    subcategories: cat.subcategories.map((sub) => ({ ...sub })),
  }));
}

export function mergeEventCategories(stored?: EventCategoryConfig[]): EventCategoryConfig[] {
  const defaults = initEventCategories();
  if (!stored?.length) return defaults;

  const storedByKey = new Map(stored.map((cat) => [cat.key, cat]));
  const mergedBuiltIns = defaults.map((defaultCat) => {
    const storedCat = storedByKey.get(defaultCat.key);
    if (!storedCat) return { ...defaultCat, subcategories: defaultCat.subcategories.map((s) => ({ ...s })) };

    const subMap = new Map<string, EventSubcategoryConfig>();
    for (const sub of defaultCat.subcategories) subMap.set(sub.key, { ...sub });
    for (const sub of storedCat.subcategories) subMap.set(sub.key, { ...sub });

    const order: string[] = [
      ...defaultCat.subcategories.map((s) => s.key),
      ...storedCat.subcategories.map((s) => s.key).filter((key) => !defaultCat.subcategories.some((d) => d.key === key)),
    ];
    const seen = new Set<string>();
    const subcategories = order
      .filter((key) => {
        if (seen.has(key) || !subMap.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((key) => subMap.get(key)!);

    return {
      ...defaultCat,
      ...storedCat,
      builtIn: true,
      subcategories,
    };
  });

  const customCategories = stored
    .filter((cat) => !defaults.some((d) => d.key === cat.key))
    .map((cat) => ({ ...cat, subcategories: cat.subcategories.map((s) => ({ ...s })) }));

  return [...mergedBuiltIns, ...customCategories];
}

export function syncWeeklyGoals(
  categories: EventCategoryConfig[],
  goals: CategoryGoals
): CategoryGoals {
  const synced: CategoryGoals = {};
  categories.forEach((cat) => {
    synced[cat.key] = goals[cat.key] ?? DEFAULT_WEEKLY_GOALS[cat.key] ?? 0;
  });
  return synced;
}

export function findEventCategory(
  categories: EventCategoryConfig[],
  key: string
): EventCategoryConfig | undefined {
  return categories.find((c) => c.key === key);
}

export function getCategoryLabel(
  categories: EventCategoryConfig[],
  key?: string
): string {
  if (!key) return '';
  return findEventCategory(categories, key)?.label ?? key;
}

export function getSubcategoryLabel(
  categories: EventCategoryConfig[],
  categoryKey: string | undefined,
  subKey: string | undefined
): string {
  if (!categoryKey || !subKey) return '';
  const cat = findEventCategory(categories, categoryKey);
  return cat?.subcategories.find((s) => s.key === subKey)?.label ?? subKey;
}

export function eventHasCategory(event: CalendarEvent): boolean {
  return Boolean(event.category);
}

export function resolveEventColor(event: CalendarEvent, categories: EventCategoryConfig[]): string {
  if (!event.category) return Theme.eventNone;
  const cat = findEventCategory(categories, event.category);
  if (!cat) return Theme.primary;
  const sub = cat.subcategories.find((s) => s.key === event.subcategory);
  return sub?.color ?? cat.color;
}

/** Light block fill for day timeline — category tint, not full saturation. */
export function resolveEventSurfaceColor(
  event: CalendarEvent,
  categories: EventCategoryConfig[]
): string {
  if (!event.category) return Theme.eventNoneSurface;
  const accent = resolveEventColor(event, categories);
  return mixHex(accent, '#FFFFFF', 0.86);
}

export function slugifyCategoryKey(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  return base || 'custom';
}

export function uniqueCategoryKey(label: string, existing: EventCategoryConfig[]): string {
  const taken = new Set(existing.map((c) => c.key));
  let key = slugifyCategoryKey(label);
  let i = 2;
  while (taken.has(key)) {
    key = `${slugifyCategoryKey(label)}_${i++}`;
  }
  return key;
}

export function uniqueSubcategoryKey(label: string, existing: EventSubcategoryConfig[]): string {
  const taken = new Set(existing.map((s) => s.key));
  let key = slugifyCategoryKey(label);
  let i = 2;
  while (taken.has(key)) {
    key = `${slugifyCategoryKey(label)}_${i++}`;
  }
  return key;
}

export function pickCategoryColor(index: number): string {
  return Theme.eventColors[index % Theme.eventColors.length];
}

export function pickSubcategoryColor(index: number): string {
  return SUB_COLOR_PALETTE[index % SUB_COLOR_PALETTE.length];
}

export function defaultCategoryKey(categories: EventCategoryConfig[]): string {
  return categories[0]?.key ?? 'general';
}

export function defaultSubcategoryKey(category: EventCategoryConfig): string {
  return category.subcategories[0]?.key ?? 'general';
}
