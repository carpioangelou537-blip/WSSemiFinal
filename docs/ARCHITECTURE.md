# Architecture

## Next.js application structure

```text
app/
  page.tsx                         Role-aware root redirect
  login/page.tsx                   Sign-in and sign-up
  dashboard/layout.tsx             Shared authenticated sidebar shell
  dashboard/hr/                    HR request dashboard and intake form
  dashboard/manager/               Assigned review queue and request detail
  dashboard/admin/                 IT request details, catalog, templates, audit
  hr/, manager/, admin/             Short URL aliases to canonical dashboard routes
actions/
  auth.ts                          Server-side sign in, sign up, and sign out
  onboarding.ts                    Suggest access and create requests
  manager.ts                       Review and decide assigned requests
  admin.ts                         Catalog/template CRUD and provisioning
components/
  auth/                            Sign-in experience
  onboarding/                      HR request form
  manager/                         Manager decision controls
  admin/                           Catalog, template, and provisioning controls
  layout/                          Responsive role navigation
lib/
  auth.ts                          Session/profile role enforcement
  supabase/client.ts               Browser Supabase client
  supabase/server.ts               Cookie-based server Supabase client
  supabase/middleware.ts           Supabase cookie refresh helper
proxy.ts                           Next.js 16 request/session redirects
types/database.ts                  Handwritten schema and JSON types
```

## Frontend → Server Action → Supabase

1. Server Components load workspace data with the authenticated cookie session. Supabase RLS limits what the user can read.
2. Client forms call exported Server Actions for authentication and data mutations. Client input is treated as untrusted.
3. Actions validate input with Zod, call `auth.getUser()`, reload the caller's role from `profiles`, and check request ownership/assignment and workflow state before mutating.
4. The action uses the session-scoped Supabase server client and anon key. It writes the relevant data and audit event, then revalidates the affected pages.
5. Any validation, role, or database error is returned to the UI and shown in a toast or page-level error. RLS still enforces the final database policy.

The application does not create database migrations, elevate privileges with a service-role key, or execute generated scripts. Multi-table workflow writes are separate Supabase requests because no transaction/RPC is part of the pre-created schema contract; if a later step fails, the UI reports that earlier step may already have succeeded.

## Authentication and authorization

- `@supabase/ssr` stores Supabase Auth sessions in cookies.
- Next.js 16 uses the root `proxy.ts` convention. It refreshes cookies and handles unauthenticated and obvious role-mismatch redirects; Proxy is not the final authorization layer.
- Shared workspace and role-specific server layouts check the profile role. Each Server Action repeats the role check and enforces request ownership and status.
- Supabase RLS is relied on for every database operation. The anon key is public by design; no service-role key is used.
- Server-side Anthropic requests use only `ANTHROPIC_API_KEY`. If it is absent or the provider request fails, a deterministic rule-based rationale is saved instead.
- PowerShell values are escaped as literals, scripts only include approved AD groups, and the script is displayed/saved but never executed.

## Request lifecycle

`pending_manager` → manager sets each item approved/denied and approves or rejects → approved requests may have a script generated → IT marks the request `provisioned` after performing external provisioning. Denied items are excluded from the generated script.
