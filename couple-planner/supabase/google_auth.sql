-- ============================================================
-- Google sign-in setup (Supabase Dashboard — not SQL)
-- 1. Authentication → Providers → Google → Enable
-- 2. Google Cloud Console → OAuth client (Web) → copy Client ID + Secret into Supabase
-- 3. Authentication → URL Configuration → Redirect URLs, add:
--      intandem://oauth-callback
--      (and the Supabase callback URL shown on the Google provider page)
-- 4. Run this file in SQL Editor for Google display names on profiles
-- ============================================================

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

update public.profiles p
set display_name = public.auth_display_name(u.raw_user_meta_data, u.email)
from auth.users u
where u.id = p.id
  and (p.display_name is null or trim(p.display_name) = '');
