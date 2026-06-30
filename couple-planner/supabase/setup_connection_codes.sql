-- Run this ONE file in Supabase Dashboard → SQL Editor
-- Prerequisite: 001_profiles.sql (basic profiles table)

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists couple_id uuid,
  add column if not exists connection_code text;

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

drop policy if exists "Couple members can view couple" on public.couples;
create policy "Couple members can view couple"
  on public.couples for select
  using (exists (select 1 from public.couple_members where couple_id = couples.id and user_id = auth.uid()));

drop policy if exists "Couple members can update couple" on public.couples;
create policy "Couple members can update couple"
  on public.couples for update
  using (exists (select 1 from public.couple_members where couple_id = couples.id and user_id = auth.uid()));

drop policy if exists "Couple members can view members" on public.couple_members;
create policy "Couple members can view members"
  on public.couple_members for select
  using (exists (
    select 1 from public.couple_members mine
    where mine.couple_id = couple_members.couple_id and mine.user_id = auth.uid()
  ));

create unique index if not exists profiles_connection_code_idx
  on public.profiles (connection_code)
  where connection_code is not null;

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
    if v_tries > 200 then
      raise exception 'Could not generate connection code';
    end if;
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
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select connection_code into v_code from public.profiles where id = v_user_id;

  if v_code is not null and v_code <> '' then
    return v_code;
  end if;

  v_code := public.generate_connection_code();

  update public.profiles set connection_code = v_code where id = v_user_id;

  if not found then
    insert into public.profiles (id, connection_code)
    values (v_user_id, v_code)
    on conflict (id) do update set connection_code = excluded.connection_code;
  end if;

  return v_code;
end;
$$;

-- Backfill any existing users missing a code
update public.profiles
set connection_code = public.generate_connection_code()
where connection_code is null or connection_code = '';

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
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
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

grant execute on function public.ensure_my_connection_code() to authenticated;
grant execute on function public.connect_with_partner_code(text) to authenticated;
grant execute on function public.get_my_couple() to authenticated;

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

grant execute on function public.update_my_display_name(text) to authenticated;
grant execute on function public.update_couple_details(text, text) to authenticated;
