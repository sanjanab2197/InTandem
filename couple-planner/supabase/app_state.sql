-- Run in Supabase SQL Editor after setup_all.sql
-- Stores calendar events, plans, expenses, categories, and weekly goals in the cloud.

create table if not exists public.couple_app_state (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  plan_items jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  plan_subcategories jsonb,
  event_categories jsonb,
  weekly_goals jsonb not null default '{}'::jsonb,
  crossed_off_dates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  plan_items jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  plan_subcategories jsonb,
  event_categories jsonb,
  weekly_goals jsonb not null default '{}'::jsonb,
  crossed_off_dates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.couple_app_state enable row level security;
alter table public.user_app_state enable row level security;

drop policy if exists "Couple members can view app state" on public.couple_app_state;
create policy "Couple members can view app state"
  on public.couple_app_state for select
  using (public.is_couple_member(couple_id));

drop policy if exists "Couple members can insert app state" on public.couple_app_state;
create policy "Couple members can insert app state"
  on public.couple_app_state for insert
  with check (public.is_couple_member(couple_id) and auth.uid() = updated_by);

drop policy if exists "Couple members can update app state" on public.couple_app_state;
create policy "Couple members can update app state"
  on public.couple_app_state for update
  using (public.is_couple_member(couple_id));

drop policy if exists "Users can view own app state" on public.user_app_state;
create policy "Users can view own app state"
  on public.user_app_state for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own app state" on public.user_app_state;
create policy "Users can insert own app state"
  on public.user_app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own app state" on public.user_app_state;
create policy "Users can update own app state"
  on public.user_app_state for update
  using (auth.uid() = user_id);

create index if not exists couple_app_state_updated_at_idx
  on public.couple_app_state (updated_at desc);

create index if not exists user_app_state_updated_at_idx
  on public.user_app_state (updated_at desc);

alter table public.couple_app_state
  add column if not exists crossed_off_dates jsonb not null default '[]'::jsonb;

alter table public.user_app_state
  add column if not exists crossed_off_dates jsonb not null default '[]'::jsonb;
