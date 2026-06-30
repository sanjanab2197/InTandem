-- Run this in Supabase SQL Editor to fix "infinite recursion" on couple_members

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

grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.is_couple_partner(uuid) to authenticated;
