-- Run in Supabase Dashboard → SQL Editor (after 001_profiles.sql)

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists couple_id uuid;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  anniversary text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_couple_id_fkey;

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

create table if not exists public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  invitee_email text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists couple_invites_code_idx on public.couple_invites (code);
create index if not exists couple_invites_inviter_idx on public.couple_invites (inviter_id);

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invites enable row level security;

-- Profiles: own row + partner in same couple
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Couple members can view partner profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Couple members can view partner profile"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.couple_members mine
      join public.couple_members theirs on mine.couple_id = theirs.couple_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Couples: members only
create policy "Couple members can view couple"
  on public.couples for select
  using (
    exists (
      select 1 from public.couple_members
      where couple_id = couples.id and user_id = auth.uid()
    )
  );

create policy "Couple members can update couple"
  on public.couples for update
  using (
    exists (
      select 1 from public.couple_members
      where couple_id = couples.id and user_id = auth.uid()
    )
  );

-- Couple members
create policy "Couple members can view members"
  on public.couple_members for select
  using (
    exists (
      select 1 from public.couple_members mine
      where mine.couple_id = couple_members.couple_id
        and mine.user_id = auth.uid()
    )
  );

-- Invites: inviter can manage; invitee can read pending by code via RPC
create policy "Inviter can view own invites"
  on public.couple_invites for select
  using (inviter_id = auth.uid());

create policy "Inviter can cancel own invites"
  on public.couple_invites for update
  using (inviter_id = auth.uid());

-- Updated signup trigger with display_name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(profiles.display_name, excluded.display_name);
  return new;
end;
$$;

-- Ensure user has a couple (solo) before inviting
create or replace function public.ensure_solo_couple()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_member_count int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select cm.couple_id into v_couple_id
  from public.couple_members cm
  where cm.user_id = v_user_id;

  if v_couple_id is not null then
    select count(*) into v_member_count
    from public.couple_members
    where couple_id = v_couple_id;

    if v_member_count >= 2 then
      raise exception 'Already connected to a partner';
    end if;

    return v_couple_id;
  end if;

  insert into public.couples default values returning id into v_couple_id;
  insert into public.couple_members (couple_id, user_id, slot)
  values (v_couple_id, v_user_id, 1);
  update public.profiles set couple_id = v_couple_id where id = v_user_id;

  return v_couple_id;
end;
$$;

create or replace function public.create_couple_invite(p_invitee_email text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_code text;
  v_invite_id uuid;
  v_existing record;
begin
  v_couple_id := public.ensure_solo_couple();

  select id, code into v_existing
  from public.couple_invites
  where couple_id = v_couple_id
    and inviter_id = v_user_id
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    update public.couple_invites
    set invitee_email = coalesce(nullif(trim(p_invitee_email), ''), invitee_email)
    where id = v_existing.id;

    return jsonb_build_object(
      'invite_code', v_existing.code,
      'couple_id', v_couple_id,
      'invitee_email', p_invitee_email
    );
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.couple_invites (couple_id, inviter_id, code, invitee_email)
  values (v_couple_id, v_user_id, v_code, nullif(trim(p_invitee_email), ''))
  returning id into v_invite_id;

  return jsonb_build_object(
    'invite_code', v_code,
    'couple_id', v_couple_id,
    'invitee_email', p_invitee_email
  );
end;
$$;

create or replace function public.accept_couple_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.couple_invites%rowtype;
  v_member_count int;
  v_user_email text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.couple_members cm
    join public.couple_members other on cm.couple_id = other.couple_id
    where cm.user_id = v_user_id
      and other.user_id <> v_user_id
  ) then
    raise exception 'Already connected to a partner';
  end if;

  select * into v_invite
  from public.couple_invites
  where code = upper(trim(p_code))
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invite code';
  end if;

  if v_invite.inviter_id = v_user_id then
    raise exception 'Cannot accept your own invite';
  end if;

  select count(*) into v_member_count
  from public.couple_members
  where couple_id = v_invite.couple_id;

  if v_member_count >= 2 then
    raise exception 'This couple already has two partners';
  end if;

  select email into v_user_email from public.profiles where id = v_user_id;

  if v_invite.invitee_email is not null
     and lower(v_invite.invitee_email) <> lower(v_user_email) then
    raise exception 'This invite was sent to a different email address';
  end if;

  delete from public.couple_members
  where user_id = v_user_id
    and couple_id <> v_invite.couple_id;

  insert into public.couple_members (couple_id, user_id, slot)
  values (v_invite.couple_id, v_user_id, 2)
  on conflict (user_id) do update
  set couple_id = excluded.couple_id,
      slot = excluded.slot;

  update public.profiles
  set couple_id = v_invite.couple_id
  where id = v_user_id;

  update public.couple_invites
  set status = 'accepted'
  where id = v_invite.id;

  return jsonb_build_object('couple_id', v_invite.couple_id, 'success', true);
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
  v_result jsonb;
begin
  if v_user_id is null then
    return null;
  end if;

  select couple_id into v_couple_id
  from public.profiles
  where id = v_user_id;

  if v_couple_id is null then
    return jsonb_build_object(
      'connected', false,
      'my_display_name', (select display_name from public.profiles where id = v_user_id),
      'my_slot', null,
      'partner1_name', coalesce((select display_name from public.profiles where id = v_user_id), 'Partner 1'),
      'partner2_name', 'Partner 2',
      'pending_invite', (
        select jsonb_build_object('code', ci.code, 'invitee_email', ci.invitee_email)
        from public.couple_invites ci
        where ci.inviter_id = v_user_id
          and ci.status = 'pending'
          and ci.expires_at > now()
        order by ci.created_at desc
        limit 1
      )
    );
  end if;

  select jsonb_build_object(
    'connected', (select count(*) = 2 from public.couple_members where couple_id = v_couple_id),
    'couple_id', v_couple_id,
    'anniversary', c.anniversary,
    'bio', c.bio,
    'my_slot', (select slot from public.couple_members where user_id = v_user_id),
    'my_display_name', (select display_name from public.profiles where id = v_user_id),
    'partner1_name', coalesce(
      (select p.display_name from public.couple_members cm join public.profiles p on p.id = cm.user_id
       where cm.couple_id = v_couple_id and cm.slot = 1),
      'Partner 1'
    ),
    'partner2_name', coalesce(
      (select p.display_name from public.couple_members cm join public.profiles p on p.id = cm.user_id
       where cm.couple_id = v_couple_id and cm.slot = 2),
      'Partner 2'
    ),
    'partner_email', (
      select p.email
      from public.couple_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.couple_id = v_couple_id and cm.user_id <> v_user_id
      limit 1
    ),
    'pending_invite', (
      select jsonb_build_object('code', ci.code, 'invitee_email', ci.invitee_email)
      from public.couple_invites ci
      where ci.inviter_id = v_user_id
        and ci.status = 'pending'
        and ci.expires_at > now()
      order by ci.created_at desc
      limit 1
    )
  ) into v_result
  from public.couples c
  where c.id = v_couple_id;

  return v_result;
end;
$$;

create or replace function public.update_my_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set display_name = nullif(trim(p_display_name), '')
  where id = auth.uid();
end;
$$;

create or replace function public.update_couple_details(p_anniversary text, p_bio text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  select couple_id into v_couple_id from public.profiles where id = auth.uid();
  if v_couple_id is null then
    raise exception 'Not in a couple';
  end if;

  update public.couples
  set anniversary = nullif(trim(p_anniversary), ''),
      bio = nullif(trim(p_bio), '')
  where id = v_couple_id;
end;
$$;

grant execute on function public.ensure_solo_couple() to authenticated;
grant execute on function public.create_couple_invite(text) to authenticated;
grant execute on function public.accept_couple_invite(text) to authenticated;
grant execute on function public.get_my_couple() to authenticated;
grant execute on function public.update_my_display_name(text) to authenticated;
grant execute on function public.update_couple_details(text, text) to authenticated;
