-- Run in Supabase SQL Editor to add "Remove partner"

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
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select cm.couple_id into v_couple_id
  from public.couple_members cm
  where cm.user_id = v_user_id
  limit 1;

  if v_couple_id is null then
    select couple_id into v_couple_id
    from public.profiles
    where id = v_user_id;
  end if;

  if v_couple_id is null then
    raise exception 'Not connected to a partner';
  end if;

  update public.profiles
  set couple_id = null
  where couple_id = v_couple_id;

  delete from public.couple_members
  where couple_id = v_couple_id;

  delete from public.couples
  where id = v_couple_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.disconnect_partner() to authenticated;
