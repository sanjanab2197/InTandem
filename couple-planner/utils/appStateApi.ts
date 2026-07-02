import { getSupabase } from '@/lib/supabase';
import { AppStatePayload } from '@/types';
import { normalizeCalendarEvents } from '@/utils/calendarEventRecord';
import { mergeAppStatePayload } from '@/utils/appStateMerge';

interface AppStateRow {
  events: AppStatePayload['events'];
  plan_items: AppStatePayload['planItems'];
  expenses: AppStatePayload['expenses'];
  key_dates: AppStatePayload['keyDates'];
  plan_subcategories: AppStatePayload['planSubcategories'];
  event_categories: AppStatePayload['eventCategories'];
  weekly_goals: AppStatePayload['weeklyGoals'];
  crossed_off_dates?: AppStatePayload['crossedOffDates'];
  updated_at: string;
}

function rowToPayload(row: AppStateRow): AppStatePayload {
  return {
    events: normalizeCalendarEvents(row.events),
    planItems: row.plan_items ?? [],
    expenses: row.expenses ?? [],
    keyDates: row.key_dates ?? [],
    planSubcategories: row.plan_subcategories ?? undefined,
    eventCategories: row.event_categories ?? undefined,
    weeklyGoals: row.weekly_goals ?? {},
    crossedOffDates: row.crossed_off_dates ?? [],
    updatedAt: row.updated_at,
  };
}

function payloadToRow(payload: AppStatePayload, updatedBy?: string) {
  return {
    events: normalizeCalendarEvents(payload.events),
    plan_items: payload.planItems,
    expenses: payload.expenses,
    key_dates: payload.keyDates ?? [],
    plan_subcategories: payload.planSubcategories ?? null,
    event_categories: payload.eventCategories ?? null,
    weekly_goals: payload.weeklyGoals,
    crossed_off_dates: payload.crossedOffDates ?? [],
    updated_at: new Date().toISOString(),
    ...(updatedBy ? { updated_by: updatedBy } : {}),
  };
}

export async function fetchCoupleAppState(coupleId: string): Promise<AppStatePayload | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('couple_app_state')
    .select('*')
    .eq('couple_id', coupleId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToPayload(data as AppStateRow & { couple_id: string });
}

export async function upsertCoupleAppState(
  coupleId: string,
  userId: string,
  payload: AppStatePayload
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('couple_app_state').upsert({
    couple_id: coupleId,
    ...payloadToRow(payload, userId),
  });

  if (error) throw new Error(error.message);
}

export async function fetchUserAppState(userId: string): Promise<AppStatePayload | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_app_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToPayload(data as AppStateRow & { user_id: string });
}

export async function upsertUserAppState(userId: string, payload: AppStatePayload): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('user_app_state').upsert({
    user_id: userId,
    ...payloadToRow(payload),
  });

  if (error) throw new Error(error.message);
}

export async function deleteUserAppState(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('user_app_state').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function migrateUserAppStateToCouple(
  userId: string,
  coupleId: string
): Promise<AppStatePayload | null> {
  const [userState, coupleState] = await Promise.all([
    fetchUserAppState(userId),
    fetchCoupleAppState(coupleId),
  ]);

  if (!userState) return coupleState;

  const merged = coupleState ? mergeAppStatePayload(userState, coupleState) : userState;

  await upsertCoupleAppState(coupleId, userId, merged);
  await deleteUserAppState(userId);

  return merged;
}

export async function syncAppStateAfterCoupleConnect(
  userId: string,
  coupleId: string
): Promise<void> {
  try {
    await migrateUserAppStateToCouple(userId, coupleId);
  } catch {
    // Migration is best-effort; AppDataSync will reconcile on next pull.
  }
}
