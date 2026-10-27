-- AccessFlow AI — fresh Supabase Cloud database setup
-- Uses Supabase Auth, the anon/authenticated role, and Row Level Security.
-- Does not create a service-role key, Docker setup, or local Supabase stack.
--
-- WARNING: This script is for a fresh project. If the schema already exists,
-- review the statements before running; CREATE TABLE IF NOT EXISTS does not
-- reconcile an existing table's columns or constraints.

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  create type public.user_role as enum ('hr', 'manager', 'it_admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.request_status as enum (
    'pending_manager',
    'approved',
    'rejected',
    'provisioned'
  );
exception
  when duplicate_object then null;
end
$$;

-- User profiles are linked to Supabase Auth users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role public.user_role not null default 'hr'
);

create table if not exists public.access_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  ad_group_name text
);

create table if not exists public.role_templates (
  id uuid primary key default gen_random_uuid(),
  job_title text not null,
  department text not null,
  access_id uuid not null references public.access_catalog(id) on delete restrict
);

create table if not exists public.onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  employee_email text not null,
  job_title text not null,
  department text not null,
  start_date date,
  manager_id uuid not null references public.profiles(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status public.request_status not null default 'pending_manager',
  ai_summary text,
  manager_comment text,
  powershell_script text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_access_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.onboarding_requests(id) on delete cascade,
  access_id uuid not null references public.access_catalog(id) on delete restrict,
  ai_suggested boolean not null default false,
  approved boolean default null,
  unique (request_id, access_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.onboarding_requests(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes used by the app's role dashboards and filters.
create index if not exists onboarding_requests_requested_by_idx
  on public.onboarding_requests (requested_by, created_at desc);

create index if not exists onboarding_requests_manager_status_idx
  on public.onboarding_requests (manager_id, status, created_at);

create index if not exists role_templates_job_department_idx
  on public.role_templates (job_title, department);

create index if not exists request_access_items_request_idx
  on public.request_access_items (request_id);

create index if not exists audit_logs_action_created_at_idx
  on public.audit_logs (action, created_at desc);

create index if not exists audit_logs_request_idx
  on public.audit_logs (request_id);

-- Returns only the signed-in user's role. SECURITY DEFINER avoids recursive
-- profile RLS checks when a policy needs to verify the caller's role.
create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
  limit 1
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

-- Create a basic HR profile when a new Supabase Auth user is created.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'hr'
  )
  on conflict (id) do nothing;

  return new;
end
$$;

drop trigger if exists on_auth_user_created_accessflow on auth.users;

create trigger on_auth_user_created_accessflow
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep updated_at current when a request changes.
create or replace function public.set_onboarding_request_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists onboarding_requests_updated_at on public.onboarding_requests;

create trigger onboarding_requests_updated_at
  before update on public.onboarding_requests
  for each row execute function public.set_onboarding_request_updated_at();

-- Protect request updates as well as row visibility.
-- Managers may change only status/comment while reviewing their pending request.
-- IT admins may change only status/script on approved or provisioned requests.
create or replace function public.guard_onboarding_request_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role public.user_role;
begin
  caller_role := public.current_app_role();

  if caller_role = 'manager' then
    if old.manager_id <> (select auth.uid())
       or old.status <> 'pending_manager'
       or new.status not in ('approved', 'rejected') then
      raise exception 'Managers may only decide their assigned pending requests';
    end if;

    if (to_jsonb(new) - 'status' - 'manager_comment' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'status' - 'manager_comment' - 'updated_at') then
      raise exception 'Managers may only update the decision and manager comment';
    end if;

    return new;
  end if;

  if caller_role = 'it_admin' then
    if old.status not in ('approved', 'provisioned')
       or new.status not in ('approved', 'provisioned')
       or (old.status = 'provisioned' and new.status <> 'provisioned') then
      raise exception 'IT admins may only update approved requests';
    end if;

    if (to_jsonb(new) - 'status' - 'powershell_script' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'status' - 'powershell_script' - 'updated_at') then
      raise exception 'IT admins may only update the script or provisioning status';
    end if;

    return new;
  end if;

  raise exception 'You are not allowed to update this request';
end
$$;

drop trigger if exists guard_onboarding_request_update on public.onboarding_requests;

create trigger guard_onboarding_request_update
  before update on public.onboarding_requests
  for each row execute function public.guard_onboarding_request_update();

-- Enable RLS on every app table.
alter table public.profiles enable row level security;
alter table public.access_catalog enable row level security;
alter table public.role_templates enable row level security;
alter table public.onboarding_requests enable row level security;
alter table public.request_access_items enable row level security;
alter table public.audit_logs enable row level security;

-- Remove policies with these names first so this script can be re-run on
-- a clean installation without duplicate-policy errors.
drop policy if exists profiles_read_self_manager_or_admin on public.profiles;
drop policy if exists profiles_insert_self_hr on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

drop policy if exists access_catalog_read_authenticated on public.access_catalog;
drop policy if exists access_catalog_insert_admin on public.access_catalog;
drop policy if exists access_catalog_update_admin on public.access_catalog;
drop policy if exists access_catalog_delete_admin on public.access_catalog;

drop policy if exists role_templates_read_authenticated on public.role_templates;
drop policy if exists role_templates_insert_admin on public.role_templates;
drop policy if exists role_templates_update_admin on public.role_templates;
drop policy if exists role_templates_delete_admin on public.role_templates;

drop policy if exists onboarding_requests_read_authorized on public.onboarding_requests;
drop policy if exists onboarding_requests_insert_hr on public.onboarding_requests;
drop policy if exists onboarding_requests_update_manager on public.onboarding_requests;
drop policy if exists onboarding_requests_update_admin on public.onboarding_requests;

drop policy if exists request_access_items_read_authorized on public.request_access_items;
drop policy if exists request_access_items_insert_hr on public.request_access_items;
drop policy if exists request_access_items_update_manager on public.request_access_items;

drop policy if exists audit_logs_read_admin on public.audit_logs;
drop policy if exists audit_logs_insert_actor on public.audit_logs;

-- Profiles:
-- Authenticated users can see their own profile and manager profiles for assignment.
-- IT admins can read all profiles and are the only users allowed to change roles.
create policy profiles_read_self_manager_or_admin
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or role = 'manager'
    or (select public.current_app_role()) = 'it_admin'
  );

create policy profiles_insert_self_hr
  on public.profiles
  for insert
  to authenticated
  with check (
    id = (select auth.uid())
    and role = 'hr'
  );

create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using ((select public.current_app_role()) = 'it_admin')
  with check ((select public.current_app_role()) = 'it_admin');

-- Access catalog: authenticated users can read it; IT admins manage it.
create policy access_catalog_read_authenticated
  on public.access_catalog
  for select
  to authenticated
  using (true);

create policy access_catalog_insert_admin
  on public.access_catalog
  for insert
  to authenticated
  with check ((select public.current_app_role()) = 'it_admin');

create policy access_catalog_update_admin
  on public.access_catalog
  for update
  to authenticated
  using ((select public.current_app_role()) = 'it_admin')
  with check ((select public.current_app_role()) = 'it_admin');

create policy access_catalog_delete_admin
  on public.access_catalog
  for delete
  to authenticated
  using ((select public.current_app_role()) = 'it_admin');

-- Role templates: authenticated users can read them; IT admins manage them.
create policy role_templates_read_authenticated
  on public.role_templates
  for select
  to authenticated
  using (true);

create policy role_templates_insert_admin
  on public.role_templates
  for insert
  to authenticated
  with check ((select public.current_app_role()) = 'it_admin');

create policy role_templates_update_admin
  on public.role_templates
  for update
  to authenticated
  using ((select public.current_app_role()) = 'it_admin')
  with check ((select public.current_app_role()) = 'it_admin');

create policy role_templates_delete_admin
  on public.role_templates
  for delete
  to authenticated
  using ((select public.current_app_role()) = 'it_admin');

-- Requests: HR sees their own, managers their assigned requests, admins all.
create policy onboarding_requests_read_authorized
  on public.onboarding_requests
  for select
  to authenticated
  using (
    requested_by = (select auth.uid())
    or manager_id = (select auth.uid())
    or (select public.current_app_role()) = 'it_admin'
  );

create policy onboarding_requests_insert_hr
  on public.onboarding_requests
  for insert
  to authenticated
  with check (
    (select public.current_app_role()) = 'hr'
    and requested_by = (select auth.uid())
    and exists (
      select 1
      from public.profiles as manager_profile
      where manager_profile.id = manager_id
        and manager_profile.role = 'manager'
    )
  );

create policy onboarding_requests_update_manager
  on public.onboarding_requests
  for update
  to authenticated
  using (
    (select public.current_app_role()) = 'manager'
    and manager_id = (select auth.uid())
    and status = 'pending_manager'
  )
  with check (
    (select public.current_app_role()) = 'manager'
    and manager_id = (select auth.uid())
    and status in ('approved', 'rejected')
  );

create policy onboarding_requests_update_admin
  on public.onboarding_requests
  for update
  to authenticated
  using (
    (select public.current_app_role()) = 'it_admin'
    and status in ('approved', 'provisioned')
  )
  with check (
    (select public.current_app_role()) = 'it_admin'
    and status in ('approved', 'provisioned')
  );

-- Request items inherit visibility from their parent request.
create policy request_access_items_read_authorized
  on public.request_access_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.onboarding_requests as request
      where request.id = request_id
    )
  );

create policy request_access_items_insert_hr
  on public.request_access_items
  for insert
  to authenticated
  with check (
    (select public.current_app_role()) = 'hr'
    and exists (
      select 1
      from public.onboarding_requests as request
      where request.id = request_id
        and request.requested_by = (select auth.uid())
        and request.status = 'pending_manager'
    )
  );

create policy request_access_items_update_manager
  on public.request_access_items
  for update
  to authenticated
  using (
    (select public.current_app_role()) = 'manager'
    and exists (
      select 1
      from public.onboarding_requests as request
      where request.id = request_id
        and request.manager_id = (select auth.uid())
        and request.status = 'pending_manager'
    )
  )
  with check (
    (select public.current_app_role()) = 'manager'
    and exists (
      select 1
      from public.onboarding_requests as request
      where request.id = request_id
        and request.manager_id = (select auth.uid())
        and request.status = 'pending_manager'
    )
  );

-- Audit log: append-only for actors; readable by IT admins.
create policy audit_logs_read_admin
  on public.audit_logs
  for select
  to authenticated
  using ((select public.current_app_role()) = 'it_admin');

create policy audit_logs_insert_actor
  on public.audit_logs
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and (select public.current_app_role()) is not null
  );

-- API privileges. RLS policies above still decide which rows are accessible.
grant usage on schema public to authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select, insert, update, delete
  on public.access_catalog to authenticated;

grant select, insert, update, delete
  on public.role_templates to authenticated;

grant select, insert
  on public.onboarding_requests to authenticated;

grant update (status, manager_comment, powershell_script)
  on public.onboarding_requests to authenticated;

grant select, insert
  on public.request_access_items to authenticated;

grant update (approved)
  on public.request_access_items to authenticated;

grant select, insert
  on public.audit_logs to authenticated;

-- Optional starter catalog rows. Uncomment to add examples.
-- insert into public.access_catalog (name, description, ad_group_name)
-- values
--   ('Email and calendar', 'Company email and calendar access', 'GG-Email-Users'),
--   ('HR platform', 'Employee HR platform access', 'GG-HR-Platform')
-- on conflict do nothing;

-- Create the Auth user first in Supabase Dashboard > Authentication > Users.
-- Then run the following in the SQL Editor to create/promote its app profile:
--
-- insert into public.profiles (id, full_name, email, role)
-- select id, 'AccessFlow Administrator', email, 'it_admin'::public.user_role
-- from auth.users
-- where lower(email) = lower('admin@gmail.com')
-- on conflict (id) do update
-- set role = excluded.role;
--
-- Verify the profile:
-- select id, full_name, email, role
-- from public.profiles
-- where lower(email) = lower('admin@gmail.com');
