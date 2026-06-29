# Four build targets over one shared codebase; no SvelteKit rewrite

We ship four surfaces — **tenant** (native, Capacitor), **landlord** (native, Capacitor), **web** (browser), and **admin** (browser) — and they must remain separately buildable because two are distinct app-store apps. We decided these are **thin app shells** (each: its own routes, Capacitor/native config, and role-specific screens) composing a **shared codebase** in `packages/`, rather than four forked copies of the source. We explicitly rejected migrating the frontend to SvelteKit.

## Context

The monorepo was created by copying the original `src/` into each app (`git` commit "copy root src into apps/tenant/src"), producing ~448 byte-identical duplicated files and 5 drifting copies of the generated Supabase types. The perceived "unsuitable for new features" pain is this 4× change fan-out plus an unresolved domain model — not the framework.

## Considered options

- **Rewrite to SvelteKit** — rejected. ~250k LOC across 4 apps; the entire shadcn/Radix UI layer is React-only; Capacitor needs an SPA build, which gives up SvelteKit's SSR (the main perf draw) on the platforms that most want it. A rewrite would force de-duplication and canonical domain models *first* anyway, then add a full translation on top. It addresses neither actual problem.
- **Keep four forked source trees** — rejected. Meets the deployment goal but is the cause of the maintenance tax; only `web` is even deployed today.
- **Thin shells over shared `packages/` (chosen)** — keeps every separate-build benefit (the per-app `capacitor.config.ts` + native projects are the correct mechanism) while removing the duplication.

## Consequences

- The 58 Supabase edge functions, RLS, and schema are framework-agnostic and untouched by this decision.
- The stale root-level Capacitor config + root `android/`/`ios/` (`com.MzanziHomes.app`) are superseded by the per-app configs and should be deleted.
- `admin` stays a fourth thin shell (browser-only, no Capacitor) to keep internal screens out of the public `web` bundle.

## Update (2026-06-29): admin folds into `web`

Superseding the last consequence above: `admin` is **merged into the `web` build target as lazy-loaded routes**, leaving **three** build targets (`web`+admin, `tenant`, `landlord`). Rationale: the admin surface is thin and benefits from one Vercel deployment, and client-side code separation is **obscurity, not a security boundary** — both surfaces hit the same Supabase backend, so the real boundary is RLS + role guards, not which bundle the code ships in. A separate admin build only protects the admin *UI*, never the *API*. Admin routes are `React.lazy`-split so their chunks stay out of the main bundle. Admin authz therefore relies entirely on RLS + `RoleGuard`/`AdminGuard`; hardening that is tracked separately (a known signup→admin escalation must be fixed before release).
