---
name: verify
description: Build/launch/drive recipe for verifying changes in this repo's tenant+landlord React apps against the local Supabase stack.
---

# Verifying dwell-view-render changes

## Local stack
- `npm run supabase -- start` (or `db reset` to replay all migrations — must stay green; smoke test: `docker exec -i supabase_db_<ref> psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/condition_records.test.sql`).
- No `psql` on host — use `docker exec -i supabase_db_rsfrvjaqxhoqavvscvwf psql -U postgres -d postgres` (the `-i` is required for heredocs; without it psql silently reads nothing).
- Keys via `npm run supabase -- status` (Publishable = anon, Secret = service role).

## Apps
- Apps default to the REMOTE supabase URL (fallback in `packages/supabase/src/client.ts`); point them local:
  `cd apps/tenant && VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=<publishable> npx vite --port 5199 --strictPort`
  (landlord likewise, e.g. port 5198).
- Login page: fill `#signin-email` / `#signin-password`, click `locator('form').getByRole('button', { name: 'Sign In' })` — a plain "Sign In" role query is ambiguous (tab + submit).

## Users / seed
- Create confirmed users via GoTrue admin API (`POST /auth/v1/admin/users`, service key) with `user_metadata.role: 'tenant' | 'landlord'` — the `handle_new_user` trigger fills `profiles` + `user_roles`.
- `tenancies` FKs: `property_id → properties`, tenant/landlord → `profiles(user_id)` (auto-created by the trigger). Minimal `properties` NOT NULLs: landlord_id, title, description, location, price, property_type.
- Inserting an active tenancy fires `trg_create_move_in_condition_record` (move-in record + notifications auto-created).

## Drive
- Playwright is in node_modules (`import from '<repo>/node_modules/playwright/index.mjs'` in a scratch .mjs), system chromium at `/usr/bin/chromium`, headless works.
- Tenant routes mount at `/tenant/*` AND `/tenant-dashboard/*`; landlord at `/enhancedlandlorddashboard/*`.
- Edge functions: `npm run supabase -- functions serve <name>` (hot reloads on file change); function `console.log` shows as `[Info]` in the serve output. Invoke with a real user JWT from the password grant (`POST /auth/v1/token?grant_type=password`).

## Gotchas
- Tenancy creation happens in the DB (`trg_create_tenancy_from_signed_lease` on lease_contracts), NOT in the sign-lease-contract edge function — the function's tenancy block is a fallback that normally never runs.
- `vite build` does not typecheck; the LSP diagnostics and `npm test` (vitest in packages/common) are the type/behaviour gates besides driving the app.
