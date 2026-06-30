import { getSupabase } from '@/lib/supabase';
import { AddReminderInput, Reminder, ReminderRepeat } from '@/types';

interface ReminderRow {
  id: string;
  couple_id: string;
  created_by: string;
  text: string;
  remind_at: string;
  assignee: string;
  completed: boolean;
  repeat_interval?: string | null;
}

const VALID_REPEATS: ReminderRepeat[] = [
  'none',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
];

function parseRepeat(value?: string | null): ReminderRepeat {
  if (value && VALID_REPEATS.includes(value as ReminderRepeat)) {
    return value as ReminderRepeat;
  }
  return 'none';
}

function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    text: row.text,
    remindAt: row.remind_at,
    assignee: row.assignee as Reminder['assignee'],
    completed: row.completed,
    repeat: parseRepeat(row.repeat_interval),
    createdBy: row.created_by,
  };
}

export async function fetchCoupleReminders(coupleId: string): Promise<Reminder[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('couple_id', coupleId)
    .order('remind_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ReminderRow[]).map(rowToReminder);
}

export async function upsertCoupleReminder(
  coupleId: string,
  userId: string,
  reminder: Reminder
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('reminders').upsert({
    id: reminder.id,
    couple_id: coupleId,
    created_by: userId,
    text: reminder.text,
    remind_at: reminder.remindAt,
    assignee: reminder.assignee,
    completed: reminder.completed,
    repeat_interval: reminder.repeat ?? 'none',
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

export async function deleteCoupleReminder(reminderId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('reminders').delete().eq('id', reminderId);
  if (error) throw new Error(error.message);
}

export function reminderFromInput(input: AddReminderInput, id: string, createdBy?: string): Reminder {
  return {
    id,
    text: input.text,
    remindAt: input.remindAt,
    assignee: input.assignee,
    repeat: input.repeat ?? 'none',
    completed: false,
    createdBy,
  };
}
