# Data access is owned by feature slices behind a lint-enforced boundary

Refining ADR-0002: the Supabase **client** is kernel (`packages/supabase`), but **data-access logic lives in each feature slice's own hooks** — the only code permitted to call `.from`/`.rpc`/`.functions.invoke` for that slice. Slices and the UI *consume* hooks; they never embed queries. We enforce this with lint, not convention.

## Context

Today data access is smeared across hooks (186 direct DB calls) and pages (74 inline calls), duplicated in four apps, with a thin unused `services/` layer. The concern driving this ADR: business/DB logic must not get re-implemented inside features or UI ad hoc — features should "import and use." Components already make zero direct DB calls; the leak is in pages and the duplication.

## Decision

- **Hooks are the data layer** (chosen over a separate plain-`services` tier). Every consumer in the app is React, so a framework-agnostic service tier would be built for a consumer that doesn't exist (YAGNI). Each slice exposes hooks; non-trivial DB logic lives behind them.
- The 74 inline page queries are refactored into slice hooks; pages stop touching the DB.
- **Lint boundaries** enforce the dependency lattice and the data rule:
  - `common` depends on nothing; `ui`, `supabase` → `common`; `features` → `ui`+`supabase`+`common`; `apps` → all.
  - `packages/ui` must not import `@mzanzihomes/supabase`.
  - Nothing outside a slice's data-access may import the supabase client or call `.from`/`.rpc`/`.functions.invoke`.

## Consequences

- Reversible to a plain-`services` tier later *if* a real non-React consumer appears (e.g. background/offline sync that must run outside a component).
- The lint rules are load-bearing: without them the codebase has already shown it will copy-paste and re-embed queries. They are part of the definition of done, not optional polish.
