-- Run in Supabase SQL Editor to enable shared couple reminders
-- (Partner devices fetch these and schedule local notifications)

create table if not exists public.reminders (
  id text primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  text text not null,
  remind_at timestamptz not null,
  assignee text not null check (assignee in ('partner1', 'partner2', 'together')),
  completed boolean not null default false,
  repeat_interval text not null default 'none' check (repeat_interval in ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

drop policy if exists "Couple members can view reminders" on public.reminders;
create policy "Couple members can view reminders"
  on public.reminders for select
  using (public.is_couple_member(couple_id));

drop policy if exists "Couple members can insert reminders" on public.reminders;
create policy "Couple members can insert reminders"
  on public.reminders for insert
  with check (public.is_couple_member(couple_id) and auth.uid() = created_by);

drop policy if exists "Couple members can update reminders" on public.reminders;
create policy "Couple members can update reminders"
  on public.reminders for update
  using (public.is_couple_member(couple_id));

drop policy if exists "Couple members can delete reminders" on public.reminders;
create policy "Couple members can delete reminders"
  on public.reminders for delete
  using (public.is_couple_member(couple_id));

create index if not exists reminders_couple_id_idx on public.reminders (couple_id);
create index if not exists reminders_remind_at_idx on public.reminders (remind_at);

-- If the table already exists, run this once:
-- alter table public.reminders drop constraint if exists reminders_repeat_interval_check;
-- alter table public.reminders add constraint reminders_repeat_interval_check
--   check (repeat_interval in ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'));
