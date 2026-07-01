import {
  AppStatePayload,
  CategoryGoals,
  EventCategoryConfig,
  PlanSubcategoriesByCategory,
} from '@/types';

function mergeByKey<T extends { key: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.key, item);
  for (const item of remote) map.set(item.key, item);
  return Array.from(map.values());
}

function mergeSubcategories(
  local?: PlanSubcategoriesByCategory,
  remote?: PlanSubcategoriesByCategory
): PlanSubcategoriesByCategory | undefined {
  if (!local && !remote) return undefined;
  if (!local) return remote;
  if (!remote) return local;

  const categories = new Set([
    ...Object.keys(local),
    ...Object.keys(remote),
  ]) as Set<keyof PlanSubcategoriesByCategory>;

  const merged = {} as PlanSubcategoriesByCategory;
  for (const category of categories) {
    merged[category] = mergeByKey(local[category] ?? [], remote[category] ?? []);
  }
  return merged;
}

function mergeEventCategories(
  local?: EventCategoryConfig[],
  remote?: EventCategoryConfig[]
): EventCategoryConfig[] | undefined {
  if (!local && !remote) return undefined;
  if (!local) return remote;
  if (!remote) return local;

  const map = new Map<string, EventCategoryConfig>();
  for (const cat of local) map.set(cat.key, cat);
  for (const cat of remote) {
    const existing = map.get(cat.key);
    if (!existing) {
      map.set(cat.key, cat);
      continue;
    }
    map.set(cat.key, {
      ...existing,
      ...cat,
      subcategories: mergeByKey(existing.subcategories ?? [], cat.subcategories ?? []),
    });
  }
  return Array.from(map.values());
}

function mergeGoals(local: CategoryGoals, remote: CategoryGoals): CategoryGoals {
  return { ...local, ...remote };
}

/** Lists with deletions must come from the newer payload — union merge resurrects deleted rows. */
function pickSyncedLists(
  a: AppStatePayload,
  b: AppStatePayload
): Pick<AppStatePayload, 'events' | 'planItems' | 'expenses' | 'crossedOffDates'> {
  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  const winner = aTime >= bTime ? a : b;
  return {
    events: winner.events,
    planItems: winner.planItems,
    expenses: winner.expenses,
    crossedOffDates: winner.crossedOffDates ?? [],
  };
}

export function mergeAppStatePayload(a: AppStatePayload, b: AppStatePayload): AppStatePayload {
  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  const primary = aTime >= bTime ? a : b;
  const lists = pickSyncedLists(a, b);

  return {
    ...lists,
    planSubcategories: mergeSubcategories(a.planSubcategories, b.planSubcategories),
    eventCategories: mergeEventCategories(a.eventCategories, b.eventCategories),
    weeklyGoals: mergeGoals(a.weeklyGoals, b.weeklyGoals),
    updatedAt: primary.updatedAt ?? new Date().toISOString(),
  };
}

export function isEmptyAppState(payload: AppStatePayload): boolean {
  return (
    payload.events.length === 0 &&
    payload.planItems.length === 0 &&
    payload.expenses.length === 0 &&
    Object.keys(payload.weeklyGoals).length === 0 &&
    !payload.planSubcategories &&
    !payload.eventCategories
  );
}

export function pickNewerAppState(local: AppStatePayload, remote: AppStatePayload): AppStatePayload {
  const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
  if (remoteTime > localTime) return remote;
  if (localTime > remoteTime) return local;
  return mergeAppStatePayload(local, remote);
}

/** Prefer local when remote is empty but local has data — avoids wiping unsynced entries. */
export function resolveAppStateOnPull(
  local: AppStatePayload,
  remote: AppStatePayload | null,
  lastLocalChangeAt: string,
  scopeChanged = false
): { action: 'upsert'; payload: AppStatePayload } | { action: 'apply'; payload: AppStatePayload } {
  if (scopeChanged) {
    if (remote) {
      return { action: 'apply', payload: remote };
    }
    return {
      action: 'apply',
      payload: {
        events: [],
        planItems: [],
        expenses: [],
        planSubcategories: undefined,
        eventCategories: undefined,
        weeklyGoals: {},
        crossedOffDates: [],
        updatedAt: new Date().toISOString(),
      },
    };
  }

  if (!remote) {
    return { action: 'upsert', payload: local };
  }

  if (!isEmptyAppState(local) && isEmptyAppState(remote)) {
    return { action: 'upsert', payload: mergeAppStatePayload(local, remote) };
  }

  const localChangedAfterRemote =
    new Date(lastLocalChangeAt).getTime() > new Date(remote.updatedAt ?? 0).getTime();

  if (localChangedAfterRemote && !isEmptyAppState(local)) {
    return { action: 'upsert', payload: mergeAppStatePayload(local, remote) };
  }

  const chosen = pickNewerAppState(local, remote);
  if (!isEmptyAppState(local) && isEmptyAppState(chosen)) {
    return { action: 'upsert', payload: mergeAppStatePayload(local, remote) };
  }

  return { action: 'apply', payload: chosen };
}
