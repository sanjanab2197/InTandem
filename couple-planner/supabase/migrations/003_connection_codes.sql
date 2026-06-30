-- Run in Supabase Dashboard → SQL Editor (after 002_couples_and_invites.sql)

alter table public.profiles
  add column if not exists connection_code text;

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
    exit when not exists (
      select 1 from public.profiles where connection_code = v_code
    );
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

  select connection_code into v_code
  from public.profiles
  where id = v_user_id;

  if v_code is not null then
    return v_code;
  end if;

  v_code := public.generate_connection_code();

  update public.profiles
  set connection_code = v_code
  where id = v_user_id;

  return v_code;
end;
$$;

-- Backfill codes for existing users
do $$
declare
  r record;
begin
  for r in select id from public.profiles where connection_code is null loop
    update public.profiles
    set connection_code = public.generate_connection_code()
    where id = r.id;
  end loop;
end;
$$;

alter table public.profiles
  alter column connection_code set not null;

-- Assign code on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  v_code := public.generate_connection_code();

  insert into public.profiles (id, email, display_name, connection_code)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_code
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      connection_code = coalesce(public.profiles.connection_code, public.generate_connection_code());

  return new;
end;
$$;

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
  v_user_email text;
  v_pending_email text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_normalized := lpad(regexp_replace(trim(p_code), '[^0-9]', '', 'g'), 8, '0');
  if length(v_normalized) <> 8 then
    raise exception 'Enter a valid 8-digit connection code';
  end if;

  perform public.ensure_my_connection_code();

  select id, couple_id into v_partner_id, v_partner_couple_id
  from public.profiles
  where connection_code = v_normalized;

  if v_partner_id is null then
    raise exception 'No account found with that code';
  end if;

  if v_partner_id = v_user_id then
    raise exception 'You cannot connect with your own code';
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

  select count(*) into v_partner_count
  from public.couple_members
  where couple_id = v_partner_couple_id;

  if v_partner_count >= 2 then
    raise exception 'That partner is already connected to someone else';
  end if;

  select email into v_user_email from public.profiles where id = v_user_id;

  select ci.invitee_email into v_pending_email
  from public.couple_invites ci
  where ci.inviter_id = v_partner_id
    and ci.status = 'pending'
    and ci.expires_at > now()
  order by ci.created_at desc
  limit 1;

  if v_pending_email is not null
     and lower(v_pending_email) <> lower(v_user_email) then
    raise exception 'This invite was sent to a different email address';
  end if;

  if v_partner_couple_id is null then
    insert into public.couples default values returning id into v_partner_couple_id;
    insert into public.couple_members (couple_id, user_id, slot)
    values (v_partner_couple_id, v_partner_id, 1);
    update public.profiles set couple_id = v_partner_couple_id where id = v_partner_id;
  end if;

  select couple_id into v_my_couple_id from public.profiles where id = v_user_id;

  if v_my_couple_id is not null and v_my_couple_id <> v_partner_couple_id then
    delete from public.couple_members
    where user_id = v_user_id and couple_id = v_my_couple_id;

    if not exists (
      select 1 from public.couple_members where couple_id = v_my_couple_id
    ) then
      delete from public.couples where id = v_my_couple_id;
    end if;
  end if;

  insert into public.couple_members (couple_id, user_id, slot)
  values (v_partner_couple_id, v_user_id, 2)
  on conflict (user_id) do update
  set couple_id = excluded.couple_id,
      slot = excluded.slot;

  update public.profiles
  set couple_id = v_partner_couple_id
  where id = v_user_id;

  update public.couple_invites
  set status = 'accepted'
  where inviter_id = v_partner_id
    and status = 'pending';

  return jsonb_build_object('couple_id', v_partner_couple_id, 'success', true);
end;
$$;

create or replace function public.accept_couple_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.connect_with_partner_code(p_code);
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
  v_code text;
  v_couple_id uuid;
begin
  v_code := public.ensure_my_connection_code();
  v_couple_id := public.ensure_solo_couple();

  update public.couple_invites
  set status = 'cancelled'
  where inviter_id = v_user_id
    and status = 'pending';

  if nullif(trim(p_invitee_email), '') is not null then
    insert into public.couple_invites (couple_id, inviter_id, code, invitee_email)
    values (
      v_couple_id,
      v_user_id,
      v_code,
      lower(trim(p_invitee_email))
    );
  end if;

  return jsonb_build_object(
    'invite_code', v_code,
    'couple_id', v_couple_id,
    'invitee_email', nullif(trim(p_invitee_email), '')
  );
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
  v_code text;
  v_pending_email text;
begin
  if v_user_id is null then
    return null;
  end if;

  v_code := public.ensure_my_connection_code();

  select ci.invitee_email into v_pending_email
  from public.couple_invites ci
  where ci.inviter_id = v_user_id
    and ci.status = 'pending'
    and ci.expires_at > now()
  order by ci.created_at desc
  limit 1;

  select couple_id into v_couple_id
  from public.profiles
  where id = v_user_id;

  if v_couple_id is null then
    return jsonb_build_object(
      'connected', false,
      'my_connection_code', v_code,
      'my_display_name', (select display_name from public.profiles where id = v_user_id),
      'my_slot', null,
      'partner1_name', coalesce((select display_name from public.profiles where id = v_user_id), 'Partner 1'),
      'partner2_name', 'Partner 2',
      'pending_invite_email', v_pending_email
    );
  end if;

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
    'pending_invite_email', v_pending_email
  ) into v_result
  from public.couples c
  where c.id = v_couple_id;

  return v_result;
end;
$$;

grant execute on function public.generate_connection_code() to authenticated;
grant execute on function public.ensure_my_connection_code() to authenticated;
grant execute on function public.connect_with_partner_code(text) to authenticated;
