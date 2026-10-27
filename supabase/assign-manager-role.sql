-- Add an existing Supabase Auth user to the manager picker.
--
-- 1. Create the manager's user in Supabase Dashboard > Authentication > Users
--    or let them sign up in AccessFlow AI.
-- 2. Replace manager@example.com below with that user's actual email.
-- 3. Run this in Supabase Dashboard > SQL Editor.
--
-- This does not create an Auth login or set a password. It creates or updates
-- only the corresponding public profile, linked by the Auth user UUID.

insert into public.profiles (id, full_name, email, role)
select
  auth_user.id,
  coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    'AccessFlow Manager'
  ),
  auth_user.email,
  'manager'::public.user_role
from auth.users as auth_user
where lower(auth_user.email) = lower('manager@gmail.com')
on conflict (id) do update
set
  email = excluded.email,
  role = excluded.role;

-- Confirm this account is now available to the manager picker.
select id, full_name, email, role
from public.profiles
where lower(email) = lower('manager@gmail.com');
