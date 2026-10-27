# AccessFlow AI

AccessFlow AI is an AI-assisted employee onboarding and access management app. HR submits employee requests, managers review and approve specific permissions, and IT administrators prepare a PowerShell script for manual provisioning.

## Stack

- Next.js 16 App Router, React, TypeScript, and Tailwind CSS 4
- Supabase Cloud with `@supabase/supabase-js` and `@supabase/ssr`
- Zod validation and cookie-based Supabase Auth
- Optional Anthropic API integration for concise access rationale

The app uses only the Supabase anon/publishable key with authenticated sessions and the existing Row Level Security policies. It does not use a service-role key, Docker, the local Supabase stack, migrations, or the Supabase CLI. The generated PowerShell is displayed and saved only; the app never executes it.

## Features by role

### HR

- View requests created by the signed-in user and their current status.
- Create an onboarding request with employee details, start date, and an assigned manager.
- Preview role-based access recommendations from matching job-title/department templates.
- Add extra permissions from the access catalog before submission.
- Store a short rule-based rationale, or use the optional Anthropic integration.

### Manager

- Review pending requests assigned to the signed-in manager.
- Approve or deny individual access items, add a note, then approve or reject the request.

### IT administrator

- See all onboarding requests and their workflow status.
- Generate and save a PowerShell script for approved access groups, copy it for manual review, and mark the request provisioned.
- Create, edit, and delete catalog items and role templates.
- Read and filter the audit log by action and date.

## Setup

### 1. Configure Supabase Cloud

Create a hosted project at [supabase.com](https://supabase.com). For a **new/empty project**, open the Supabase Dashboard SQL Editor and run [`supabase/setup.sql`](./supabase/setup.sql). It creates the tables and RLS policies used by the app. **Do not run it blindly on a project whose schema already exists**; inspect your existing tables and policies first. The app itself does not run migrations or alter the database schema.

Use the project URL and anon/publishable key from **Project Settings → API**.

### 2. Configure environment variables

Copy the example file and fill in the project values:

```powershell
Copy-Item .env.example .env.local
```

Set these variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

The Supabase URL and anon key are required. `ANTHROPIC_API_KEY` is optional and is only read in a server action. The `.env.local` file is git-ignored; never add a service-role key to this app.

### 3. Create and assign test users

Create test users through **Supabase Dashboard → Authentication → Users** or the app’s sign-up form. When email confirmation is disabled, sign-up attempts to create a self-owned `hr` profile; if confirmation is enabled, create the profile after confirmation. Use the user's Auth UUID in the existing `profiles` table and assign the intended role. For example, from the Supabase SQL editor:

```sql
UPDATE public.profiles SET role = 'hr' WHERE id = '<auth-user-uuid>';
UPDATE public.profiles SET role = 'manager' WHERE id = '<auth-user-uuid>';
UPDATE public.profiles SET role = 'it_admin' WHERE id = '<auth-user-uuid>';
```

The profile table must permit the signed-in user to read their own profile. The signup flow also requires the existing RLS policy to permit a user to insert their own HR profile, or an administrator can create the profile manually. Manager selection requires authenticated users to be able to read manager profiles.

To set up an IT administrator, first create the user in **Supabase Dashboard → Authentication → Users** (choose a strong, unique password). Then run this in the SQL Editor to create or promote the matching app profile:

```sql
INSERT INTO public.profiles (id, full_name, email, role)
SELECT id, 'AccessFlow Administrator', email, 'it_admin'::public.user_role
FROM auth.users
WHERE lower(email) = lower('admin@gmail.com')
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role;
```

This SQL assigns the application role; it does not create an Auth user or set its password. Do not put passwords in SQL files or source control.

To make a manager appear in HR's **Select Manager** list, create that user in Supabase Authentication or have them sign up, replace `manager@example.com` in [`supabase/assign-manager-role.sql`](./supabase/assign-manager-role.sql) with their email, and run the script in the SQL Editor. The picker lists profiles whose role is `manager`.

To populate a starter catalog, run [`supabase/seed-access-catalog.sql`](./supabase/seed-access-catalog.sql) in the Supabase SQL Editor and adjust the example AD group names to your organization. Then create matching role templates in the IT administrator screens. RLS must allow authenticated reads and role-appropriate writes. If a query is denied, the app displays the Supabase permission error rather than treating it as an empty result.

### 4. Install and run

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run the production validation with:

```powershell
npm run lint
npm run build
```

## Request flow

1. HR submits an onboarding request. The server verifies the HR role and manager, matches `role_templates`, combines recommendations with HR-selected extra access, and records the request, items, rationale, and audit event.
2. The assigned manager reviews each permission, records approvals/denials and a comment, then approves or rejects the request.
3. IT can generate a script only after approval. The script creates an Active Directory user and adds approved `ad_group_name` groups; it is saved to `powershell_script` and never executed by the app.
4. After the IT operator completes provisioning outside the app, they mark the request as provisioned. The app records the status change in `audit_logs`.

## Routes

- `/login` — sign in or create an HR account.
- `/hr` and `/hr/new-request` — HR aliases; the canonical pages are under `/dashboard/hr`.
- `/manager` and `/manager/[id]` — manager queue and request review.
- `/admin`, `/admin/[id]`, `/admin/catalog`, `/admin/templates`, `/admin/audit` — IT admin aliases.
- `/dashboard/...` — canonical role workspaces and detail pages.

The root `proxy.ts` refreshes Supabase cookies and redirects unauthenticated or mismatched-role requests. Server layouts and each mutation independently re-check the profile role. RLS remains the final database authorization layer.

## Project structure

```text
actions/                 Server Actions for auth, onboarding, manager, and admin workflows
app/
  dashboard/             Canonical HR, manager, and IT admin routes
  login/                  Authentication UI
  api/                    No privileged database API; mutations use Server Actions
components/               Responsive workspace, form, review, and admin UI
lib/auth.ts               Server-side role checks
lib/supabase/             Browser, server, and Proxy Supabase clients
proxy.ts                  Next.js 16 request/session handling
types/database.ts         Hand-maintained Supabase schema types
docs/                     ERD, architecture, and agent log
```

## Documentation

- [Entity relationships and RLS expectations](./docs/ERD.md)
- [Application architecture and security controls](./docs/ARCHITECTURE.md)
- [Implementation log](./docs/AGENT_LOG.md)
