-- Starter access catalog for an existing AccessFlow AI database.
-- Run in Supabase Dashboard > SQL Editor as a database administrator.
-- Adjust the AD group names to match your organization's Active Directory.
--
-- This script skips catalog entries with the same name, so it can be rerun.

insert into public.access_catalog (name, description, ad_group_name)
select seed.name, seed.description, seed.ad_group_name
from (
  values
    ('Email and calendar', 'Company email, calendar, and collaboration tools', 'GG-Email-Users'),
    ('HR platform', 'Employee human resources platform access', 'GG-HR-Platform'),
    ('Finance systems', 'Finance and accounting tools for the role', 'GG-Finance-Users'),
    ('Engineering tools', 'Engineering development and issue-tracking tools', 'GG-Engineering-Users'),
    ('Sales CRM', 'Customer relationship management platform access', 'GG-Sales-CRM'),
    ('Customer support', 'Customer support tools and ticket queues', 'GG-Customer-Support'),
    ('File sharing', 'Company shared drives and document collaboration', 'GG-Shared-Drive-Users'),
    ('VPN access', 'Remote network access for approved employees', 'GG-VPN-Users')
) as seed(name, description, ad_group_name)
where not exists (
  select 1
  from public.access_catalog as existing
  where lower(existing.name) = lower(seed.name)
);

-- Check the catalog items:
select id, name, description, ad_group_name
from public.access_catalog
order by name;
