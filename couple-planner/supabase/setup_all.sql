-- ============================================================
-- InTandem APP — run this ENTIRE file once in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  connection_code text,
  couple_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- 2. Couples
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  anniversary text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_couple_id_fkey;
alter table public.profiles
  add constraint profiles_couple_id_fkey
  foreign key (couple_id) references public.couples(id) on delete set null;

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (couple_id, slot),
  unique (user_id)
);

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

-- Helper functions bypass RLS (avoids infinite recursion in policies)
create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_couple_partner(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.couple_members mine
    join public.couple_members theirs on mine.couple_id = theirs.couple_id
    where mine.user_id = auth.uid() and theirs.user_id = p_profile_id
  );
$$;

drop policy if exists "Couple members can view couple" on public.couples;
create policy "Couple members can view couple"
  on public.couples for select
  using (public.is_couple_member(id));

drop policy if exists "Couple members can update couple" on public.couples;
create policy "Couple members can update couple"
  on public.couples for update
  using (public.is_couple_member(id));

drop policy if exists "Couple members can view members" on public.couple_members;
create policy "Couple members can view members"
  on public.couple_members for select
  using (public.is_couple_member(couple_id));

drop policy if exists "Couple members can view partner profile" on public.profiles;
create policy "Couple members can view partner profile"
  on public.profiles for select
  using (public.is_couple_partner(id));

create unique index if not exists profiles_connection_code_idx
  on public.profiles (connection_code)
  where connection_code is not null;

-- 3. Connection code helpers
create or replace function public.generate_connection_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_tries int := 0;
begin
  loop
    v_code := lpad((floor(random() * 100000000)::bigint)::text, 8, '0');
    exit when not exists (select 1 from public.profiles where connection_code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 200 then raise exception 'Could not generate connection code'; end if;
  end loop;
  return v_code;
end;
$$;

create or replace function public.ensure_my_connection_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_email text;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select connection_code into v_code from public.profiles where id = v_user_id;
  if v_code is not null and v_code <> '' then return v_code; end if;

  select email into v_email from auth.users where id = v_user_id;
  v_code := public.generate_connection_code();

  insert into public.profiles (id, email, connection_code)
  values (v_user_id, v_email, v_code)
  on conflict (id) do update set connection_code = excluded.connection_code;

  return v_code;
end;
$$;

-- Helper: display name from email/password or Google OAuth metadata
create or replace function public.auth_display_name(raw jsonb, email text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(raw->>'display_name'), ''),
    nullif(trim(raw->>'full_name'), ''),
    nullif(trim(raw->>'name'), ''),
    split_part(email, '@', 1)
  );
$$;

-- 4. Auto-create profile + code on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, connection_code)
  values (
    new.id,
    new.email,
    public.auth_display_name(new.raw_user_meta_data, new.email),
    public.generate_connection_code()
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      connection_code = coalesce(public.profiles.connection_code, public.generate_connection_code());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Backfill existing auth users (if you signed up before running this)
insert into public.profiles (id, email, display_name, connection_code)
select
  u.id,
  u.email,
  public.auth_display_name(u.raw_user_meta_data, u.email),
  public.generate_connection_code()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles
set connection_code = public.generate_connection_code()
where connection_code is null or connection_code = '';

-- 6. Connect two users by partner's code
create or replace function public.connect_with_partner_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized text;
  v_partner_id uuid;
  v_partner_couple_id uuid;
  v_my_couple_id uuid;
  v_partner_count int;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  v_normalized := lpad(regexp_replace(trim(p_code), '[^0-9]', '', 'g'), 8, '0');
  if length(regexp_replace(trim(p_code), '[^0-9]', '', 'g')) < 1 then
    raise exception 'Enter a valid 8-digit code';
  end if;

  perform public.ensure_my_connection_code();

  select id, couple_id into v_partner_id, v_partner_couple_id
  from public.profiles where connection_code = v_normalized;

  if v_partner_id is null then raise exception 'No account found with that code'; end if;
  if v_partner_id = v_user_id then raise exception 'You cannot connect with your own code'; end if;

  if exists (
    select 1 from public.couple_members cm
    join public.couple_members other on cm.couple_id = other.couple_id
    where cm.user_id = v_user_id and other.user_id <> v_user_id
  ) then raise exception 'Already connected to a partner'; end if;

  if v_partner_couple_id is not null then
    select count(*) into v_partner_count from public.couple_members where couple_id = v_partner_couple_id;
    if v_partner_count >= 2 then raise exception 'That partner is already connected'; end if;
  end if;

  if v_partner_couple_id is null then
    insert into public.couples default values returning id into v_partner_couple_id;
    insert into public.couple_members (couple_id, user_id, slot) values (v_partner_couple_id, v_partner_id, 1);
    update public.profiles set couple_id = v_partner_couple_id where id = v_partner_id;
  end if;

  select couple_id into v_my_couple_id from public.profiles where id = v_user_id;

  if v_my_couple_id is not null and v_my_couple_id <> v_partner_couple_id then
    delete from public.couple_members where user_id = v_user_id and couple_id = v_my_couple_id;
    if not exists (select 1 from public.couple_members where couple_id = v_my_couple_id) then
      delete from public.couples where id = v_my_couple_id;
    end if;
  end if;

  insert into public.couple_members (couple_id, user_id, slot)
  values (v_partner_couple_id, v_user_id, 2)
  on conflict (user_id) do update set couple_id = excluded.couple_id, slot = excluded.slot;

  update public.profiles set couple_id = v_partner_couple_id where id = v_user_id;

  return jsonb_build_object('success', true, 'couple_id', v_partner_couple_id);
end;
$$;

create or replace function public.get_my_couple()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_code text;
begin
  if v_user_id is null then return null; end if;

  v_code := public.ensure_my_connection_code();
  select couple_id into v_couple_id from public.profiles where id = v_user_id;

  if v_couple_id is null then
    return jsonb_build_object(
      'connected', false,
      'my_connection_code', v_code,
      'my_display_name', (select display_name from public.profiles where id = v_user_id),
      'partner1_name', coalesce((select display_name from public.profiles where id = v_user_id), 'Partner 1'),
      'partner2_name', 'Partner 2'
    );
  end if;

  return (
    select jsonb_build_object(
      'connected', (select count(*) = 2 from public.couple_members where couple_id = v_couple_id),
      'my_connection_code', v_code,
      'couple_id', v_couple_id,
      'anniversary', c.anniversary,
      'bio', c.bio,
      'my_slot', (select slot from public.couple_members where user_id = v_user_id),
      'my_display_name', (select display_name from public.profiles where id = v_user_id),
      'partner1_name', coalesce(
        (select p.display_name from public.couple_members cm join public.profiles p on p.id = cm.user_id
         where cm.couple_id = v_couple_id and cm.slot = 1), 'Partner 1'),
      'partner2_name', coalesce(
        (select p.display_name from public.couple_members cm join public.profiles p on p.id = cm.user_id
         where cm.couple_id = v_couple_id and cm.slot = 2), 'Partner 2'),
      'partner_email', (
        select p.email from public.couple_members cm
        join public.profiles p on p.id = cm.user_id
        where cm.couple_id = v_couple_id and cm.user_id <> v_user_id limit 1)
    )
    from public.couples c where c.id = v_couple_id
  );
end;
$$;

create or replace function public.update_my_display_name(p_display_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set display_name = nullif(trim(p_display_name), '') where id = auth.uid();
end; $$;

create or replace function public.update_couple_details(p_anniversary text, p_bio text)
returns void language plpgsql security definer set search_path = public as $$
declare v_couple_id uuid;
begin
  select couple_id into v_couple_id from public.profiles where id = auth.uid();
  if v_couple_id is null then raise exception 'Not in a couple'; end if;
  update public.couples
  set anniversary = nullif(trim(p_anniversary), ''), bio = nullif(trim(p_bio), '')
  where id = v_couple_id;
end; $$;

grant execute on function public.ensure_my_connection_code() to authenticated;
grant execute on function public.connect_with_partner_code(text) to authenticated;
grant execute on function public.get_my_couple() to authenticated;
grant execute on function public.update_my_display_name(text) to authenticated;
grant execute on function public.update_couple_details(text, text) to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.is_couple_partner(uuid) to authenticated;

create or replace function public.disconnect_partner()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select cm.couple_id into v_couple_id
  from public.couple_members cm
  where cm.user_id = v_user_id
  limit 1;

  if v_couple_id is null then
    select couple_id into v_couple_id from public.profiles where id = v_user_id;
  end if;

  if v_couple_id is null then raise exception 'Not connected to a partner'; end if;

  update public.profiles set couple_id = null where couple_id = v_couple_id;
  delete from public.couple_members where couple_id = v_couple_id;
  delete from public.couples where id = v_couple_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.disconnect_partner() to authenticated;

-- ============================================================
-- 8. App state (calendar events, planner items, expenses)
-- ============================================================

create table if not exists public.couple_app_state (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  plan_items jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  plan_subcategories jsonb,
  event_categories jsonb,
  weekly_goals jsonb not null default '{}'::jsonb,
  crossed_off_dates jsonb not null default '[]'::jsonb,
  key_dates jsonb not null default '[]'::jsonb,
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
  key_dates jsonb not null default '[]'::jsonb,
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

alter table public.couple_app_state
  add column if not exists key_dates jsonb not null default '[]'::jsonb;

alter table public.user_app_state
  add column if not exists key_dates jsonb not null default '[]'::jsonb;

-- ============================================================
-- 9. Shared reminders
-- ============================================================

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
