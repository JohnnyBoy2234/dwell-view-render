# Codebase Assessment — Problems & Remediation

> **Scope:** Architectural and code-health review of the MzanziHomes monorepo (`apps/{admin,landlord,tenant,web}`, `packages/{ui,common,supabase}`, `supabase/functions`), conducted ahead of an AI-powered version.
>
> **Origin context:** This is a Lovable-generated codebase (`.lovable/`, the 4× app duplication, the AI gateway choice all point to it). That single fact explains most of the patterns below — they are generation artefacts, not deliberate decisions. Plan accordingly.
>
> **Status note:** A dedup pass is in progress on branch `dedup/shared-ui-components` (dead `rc/` deleted; 226 identical components moved into `packages/ui` + shimmed). This document describes the problems as they exist on `main`, and flags what that branch already addresses.

---

## Severity legend

| Level | Meaning |
|-------|---------|
| 🔴 **Critical** | Actively dangerous or blocks safe change; fix before AI work. |
| 🟠 **High** | Large, compounding maintenance tax; fix early. |
| 🟡 **Medium** | Real friction; fix opportunistically. |
| ⚪ **Low** | Hygiene; cheap wins. |

---

## 🔴 Critical

### C1. The four apps are one application copied four times

**Problem.** `apps/admin`, `apps/landlord`, `apps/tenant`, `apps/web` each hold ~450 TS/TSX files, and the overwhelming majority are **byte-for-byte identical** across all four. The split was done by copying the entire application and changing only routing — not by dividing the product by audience.

**Evidence.**
- 337 component basenames appear in all 4 apps; **330 were byte-identical**.
- Only **7 files genuinely differ** between apps (`App.tsx`, `main.tsx`, `mini-navbar.tsx`, `StatCard.tsx`, `PropertySearchWidget.tsx`, `LeaseDashboard.tsx`, `EmailVerification.tsx`).
- The identical-everywhere set includes **admin-only** chrome (`AdminSidebar.tsx`, `AdminGuard.tsx`, `AdminLayout.tsx`) — i.e. the admin app's furniture is duplicated, unused, into the tenant/landlord/web apps.

**Why it matters.** Every change to a shared component must be made (or it silently drifts) in four places. Bug surface ×4. Review burden ×4. This is the single biggest barrier to "suitable for change."

**Impact on AI roadmap.** Every AI-touching UI element (chat widget, OCR-review panel, "explain this lease" button) gets built and maintained four times. `AISupportChat.tsx` — your *existing* AI feature — was already quadrupled before any new work started.

**Fix.** Move identical code into `packages/ui` / `packages/common`; reduce each app to routing + its genuinely-unique files. **Partially done** on `dedup/shared-ui-components` for `components/` (226 collapsed via re-export shims, typechecks clean). **Not yet done** for the rest — see C2.

---

### C2. Duplication extends far beyond components — hooks, pages, utils, types are still 4×

**Problem.** The in-progress dedup only touched `components/`. The rest of each app's `src/` is still fully duplicated.

**Evidence (files across the 4 apps combined).**

| Folder | Total files across 4 apps | Basenames present in all 4 |
|--------|---------------------------|----------------------------|
| `hooks` | 280 | 69 (≈276 of the 280 are the same 69 hooks ×4) |
| `pages` | 104 | ~26 pages ×4 |
| `constants` | 64 | — |
| `types` | 52 | — |
| `utils` | 36 | — |
| `services` | 20 | — |
| `lib` | 16 | — |
| `integrations` | 8 | — |

**Why it matters.** Same disease as C1, in the layers that hold business logic (hooks, services) and contracts (types). Duplicated **types** are especially corrosive: `@/types/dashboard` etc. exist independently in each app and can drift apart, so the "same" data shape silently means four different things.

**Impact on AI roadmap.** AI features lean heavily on hooks (data fetching, streaming state) and types (LLM/OCR response shapes). Four copies of a `PropertyCardProps` or a payment hook means four places an AI integration can diverge.

**Fix.** Extend the proven shim recipe to `hooks`, `lib`, `utils`, `constants`, `types`, `services` → `packages/common` (logic/types) and `packages/ui` (UI hooks). Do it in dependency order (leaves first), one folder per reviewed batch, behind a typecheck gate.

---

### C3. TypeScript safety is switched off — and actively suppressed

**Problem.** Strictness is disabled at config level *and* overridden inline across the codebase.

**Evidence.**
- Root + app `tsconfig`: `strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`.
- **203 files** contain `@ts-ignore` / `@ts-nocheck` — the checker is being silenced wholesale, not just configured loosely.

**Why it matters.** The compiler cannot catch the single most common runtime bug — `undefined`/`null` access — and 203 files have opted out of type checking entirely. You are flying without the instrument that TypeScript exists to provide.

**Impact on AI roadmap.** AI features *are* the business of handling uncertain shapes: LLM JSON, OCR output, partial tool calls, streaming chunks. With null-checking off and 203 ignore-escapes, the compiler is blind to precisely the bug class these features generate, and any new AI code can quietly inherit `any` from the untyped surface around it. This is the most dangerous setting in the repo for where you're going.

**Fix.** Don't boil the ocean. Turn on `strictNullChecks` in `packages/common` and in all new AI/edge code first; burn down `@ts-ignore` in the payment/money and AI paths; expand app-by-app over time.

---

### C4. Three competing lockfiles; ambiguous package manager

**Problem.** The repo ships **`bun.lock`, `pnpm-lock.yaml`, and `package-lock.json`** simultaneously, while `package.json` declares `packageManager: npm@11.6.2`.

**Why it matters.** Non-deterministic installs. Different contributors (and CI, and the deploy script) can resolve different dependency trees depending on which tool they reach for. "Works on my machine" is guaranteed eventually. This also undermines the monorepo's whole point (one consistent dependency graph).

**Fix.** Pick one (npm is already declared and matches `package-lock.json`). Delete the other two lockfiles, add them to `.gitignore`, and document the choice. Five-minute fix; outsized payoff.

---

### C5. `.env` is committed to git

**Problem.** `.env` is tracked in version control (alongside the legitimate `.env.example`).

**Why it matters.** Any real secret in a tracked `.env` is exposed to everyone with repo access and lives forever in git history even if later removed. For a platform handling KYC, payments (Paystack/CallPay), and DocuSign, leaked keys are a direct financial/legal risk.

**Fix.** Confirm whether it holds live secrets; if so, **rotate them**, then `git rm --cached .env`, add `.env` to `.gitignore`, and keep only `.env.example`. (Removing from history requires a history rewrite — assess separately.)

---

## 🟠 High

### H1. The AI backend is the frontend disease repeated — copy-paste, no seam

**Problem.** The three existing AI edge functions each independently hardcode the model call. `supabase/functions/_shared/` contains **only `cors.ts`** — there is no shared AI client, prompt layer, or validation.

**Evidence.** `ai-support-chat`, `accounting-ai-assistant`, and `ai-payment-ocr` all separately do `fetch('https://ai.gateway.lovable.dev/v1/chat/completions')` with `model: 'google/gemini-2.5-flash'`, their own headers, and ad-hoc response parsing.

**Why it matters.** "Add an AI feature" today = paste the gateway boilerplate a fourth time, hardcode a model string, and parse the response with no validation. You are about to scale the exact duplication you're paying to remove on the frontend, in the layer that costs real money per call.

**Fix.** One `_shared/ai.ts` exposing `complete()` / `completeStructured(schema)` that owns provider URL, model selection, retries, token logging, and output validation. Migrate the three existing functions onto it.

---

### H2. Vendor lock-in to the Lovable AI gateway, single model, no validation

**Problem.** All AI runs through `ai.gateway.lovable.dev` on a single hardcoded model (`google/gemini-2.5-flash`), with no fallback and no schema validation of outputs. Meanwhile `package.json` carries an unused-by-backend `openai` dependency, so the intended provider story is already muddled.

**Why it matters.** For a product whose *value* will be the AI, the model is an opaque third-party dependency you don't control, can't swap in one place, and don't validate. `ai-payment-ocr` in particular feeds model output toward financial data with no zod/`schema` gate — untyped LLM JSON flowing into money paths.

**Fix.** Centralize model choice behind H1's `_shared/ai.ts` (one constant to change). Decide provider deliberately (the project's own conventions favour latest Claude for AI apps). Validate every structured output with zod at the boundary — the one safety measure not to ship without, given C3.

---

### H3. No automated tests

**Problem.** There are **zero `*.test.*` / `*.spec.*` files** in `apps/` or `packages/`, despite Vitest, Playwright, and test directories being configured at the root.

**Why it matters.** ~1,800 files of app code and 60+ edge functions, with the type checker disabled (C3), and nothing asserting behaviour. Refactors (like the very dedup needed to make this maintainable) have no safety net beyond `tsc`. Money paths (payments, invoices, reconciliation) are unverified.

**Impact on AI roadmap.** AI features are non-deterministic and need tests around their *deterministic edges* (prompt assembly, schema validation, reconciliation math). Starting that with no test culture or harness is starting from zero.

**Fix.** Don't backfill 1,800 files. Add tests at the seams that matter: the new `_shared/ai.ts` validation, the payment/reconciliation logic, and each shared package's public API as it's extracted. Grow coverage with new work.

---

### H4. Domain/schema ambiguity — competing tables for one concept

**Problem.** `CONTEXT.md` itself documents that several domain concepts map to more than one database table, with dead/competing synonyms still present (e.g. canonical `lease_contracts` vs the dead `leases`; `signature_audit` vs dead `lease_signatures`; `tenancies` vs overloaded "lease").

**Why it matters.** A human tolerates ambiguity; ambiguous schema is technical debt that produces *wrong* behaviour when code (or a person) picks the wrong table. The glossary is excellent, but the schema hasn't been collapsed onto it yet.

**Impact on AI roadmap.** An LLM asked to reason over your schema (for search, "explain this lease", grounded support) will pick the wrong table confidently. Schema ambiguity directly degrades AI grounding quality. This moves from "hygiene" to "AI correctness" the moment a model reads the DB.

**Fix.** Execute the collapse `CONTEXT.md` already tracks — migrate onto canonical tables, drop the dead ones. Prioritize the tables AI features will read.

---

### H5. Half-built, uncoordinated payment/rent subsystem

**Problem.** Rent-payment functionality is spread across ~6 edge functions and ~5 components that don't share state: `payment-reminder-scheduler`, `send-payment-reminder`, `verify-payment-proof`, `ai-payment-ocr`, `LandlordPaymentLedger.tsx`, `useProofOfPayment`, `PaymentVerificationUpload`, etc. There is no single reconciliation source of truth tying "money received" to "rent expected, per tenant."

**Why it matters.** The most financially important workflow in the product (rent in → bond out) is implemented as disconnected limbs. The ledger is manual; reminders are blind/time-based; PoP verification is a separate island. Bugs and gaps hide in the seams between them.

**Fix.** Define one reconciliation model (per-tenant ledger: expected/received/outstanding/carryover) and make the existing functions its inputs and execution arms rather than independent features.

---

## 🟡 Medium

### M1. Leaky shared-package abstraction (`@/` resolves in the consumer)

**Problem.** `packages/ui` is consumed as raw source (no build step) and its components import `@/lib/utils`, which resolves against **whichever app** imports them — not against the package itself. The package has no `@/` path of its own.

**Why it matters.** It works only because every app defines an identical `@/` alias and an identical `@/lib/utils`. It is a hidden coupling: the package secretly depends on its consumers, and a package component will break if any consuming app lacks the expected `@/...` file. It also blocks ever building/publishing `packages/ui` independently.

**Fix.** Over time, have package components import their dependencies from within the package (relative or `@mzanzihomes/*`) rather than `@/`. Acceptable to defer, but know it's there.

---

### M2. tsconfig sprawl and deprecated options

**Problem.** Five root tsconfig files (`tsconfig.json`, `.app`, `.node`, `.test`, `.overrides`) plus per-app copies, and `tsc` already warns that `baseUrl` is deprecated for TS 7.

**Why it matters.** Configuration is hard to reason about and will need migration before a TypeScript upgrade. Multiple overlapping configs make it unclear which settings actually apply where.

**Fix.** Consolidate; add `ignoreDeprecations` or migrate off `baseUrl` to plain `paths`.

---

### M3. Loose ad-hoc scripts at the repo root

**Problem.** Tracked top-level scripts: `login-smoke.js`, `login-supabase.js`, `search-load.js`, `smoke.js`, plus `deploy.sh`. These are uncategorized one-offs sitting in the project root.

**Why it matters.** Root clutter, unclear ownership/intent, and they widen the surface every search and every AI agent has to wade through. Some appear to embed login/smoke logic that may touch credentials.

**Fix.** Move into `scripts/` (or `tests/smoke/`), document what each is for, delete the dead ones.

---

### M4. Stale migration artefacts

**Problem.** The flat→monorepo migration left debris: the untracked `rc/` directory (≈500 files, a verbatim copy of old `src/`) and the tracked old `src/` tree (≈510 files) staged for deletion. A `RentLekker/` iOS Xcode project also appears in the deletion set.

**Why it matters.** Dead code inflates every grep, every search, and every AI agent's context window, and invites accidental edits to the wrong (dead) copy.

**Fix.** `rc/` already deleted on the dedup branch. Finalize removal of old `src/` and any other leftover trees; commit the cleanup.

---

## ⚪ Low / hygiene

- **L1. Multiple package managers implied by tooling** beyond the lockfiles (see C4) — align scripts, CI, and `deploy.sh` on the one chosen manager.
- **L2. `components.json` / shadcn config** present — ensure new shared primitives are generated into `packages/ui`, not back into an app, to avoid re-duplicating C1.
- **L3. Mixed quote/style conventions** visible across duplicated files (single vs double quotes, BOM characters in shimmed files) — a formatter (Prettier) in a pre-commit hook would normalize and prevent spurious diffs.
- **L4. No CODEOWNERS / no documented branch or PR flow** for a repo this size — cheap to add, helps once more than one person (or agent) is changing shared packages.

---

## What's genuinely good (keep it)

- **Domain rigor.** `CONTEXT.md` (ubiquitous-language glossary, naming the dead tables), `docs/adr/`, and `docs/agents/` are better than most codebases of this size have. This is your single biggest asset for AI work — it's the grounding document.
- **Right backend substrate.** Supabase (Postgres + RLS + edge functions + cron) is the correct foundation. Async job patterns already exist (`viewing-reminders-worker`, `payment-reminder-scheduler`) and should be reused rather than reinvented.
- **The shared-package seam exists** and, post-dedup, finally carries real weight.
- **No committed `node_modules` / `dist`** — build artefacts are correctly ignored.

---

## Recommended remediation order

1. **C4, C5, M4** — lockfiles, tracked `.env`, dead trees. Hours of work, removes risk and noise immediately.
2. **C1 → C2** — finish the dedup: components (done) → hooks/utils/constants/types/services/pages into shared packages, behind a typecheck gate, one reviewed batch at a time.
3. **H1 + H2** — build `_shared/ai.ts` with `completeStructured(schema)`; migrate the three existing AI functions onto it. Decide the model/provider story in that one file.
4. **C3** — turn on `strictNullChecks` in `packages/common` and all new AI/edge code; burn down `@ts-ignore` in money and AI paths.
5. **H4** — collapse the schema onto `CONTEXT.md`'s canonical tables, prioritizing what AI will read.
6. **H3** — add tests at the new seams (AI validation, reconciliation, package public APIs) as work proceeds.
7. **H5, M1–M3, L1–L4** — opportunistically, as you touch the relevant areas.

**The throughline:** this codebase's defining problem is *uncontrolled duplication* — across apps (C1/C2), across AI functions (H1/H2), and across the payment subsystem (H5) — compounded by *disabled type safety* (C3). Fixing duplication and re-enabling the type checker, in that order, is what converts this from "generated MVP" into something an AI-powered v2 can be built on safely.
