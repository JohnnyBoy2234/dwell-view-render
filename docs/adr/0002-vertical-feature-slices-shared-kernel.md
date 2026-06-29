# Vertical feature slices in shared packages, over a shared kernel

The shared code in `packages/` is organised as **vertical feature slices** (e.g. `leases`, `maintenance`, `kyc`, `payments`) — each co-locating its components, hooks, types, and data access behind a public API — sitting on top of a **shared kernel** (`packages/ui`, `packages/supabase`, auth, design tokens). App shells compose the slices they need; slices depend on the kernel but not on each other. The domain model must be pinned (see `CONTEXT.md`) before a slice is cut, because the slice boundary is the domain boundary.

## Context

Today a feature is smeared across `components/`, `hooks/`, `utils/`, and `types/` — in four apps. That scatter is the day-to-day friction. Vertical slicing co-locates each feature so a change touches one boundary.

## Considered options

- **Layer-based shared packages** (`packages/ui`, `packages/hooks`, `packages/api`, `packages/types`) — rejected as the primary structure. Layering is what produces the current scatter; the pain is "a feature lives in five folders," which slicing fixes.
- **Pure vertical slices with no shared kernel** — rejected. Total slice isolation re-creates duplication for cross-cutting concerns (UI primitives, Supabase client, auth). We keep the kernel that already exists.

## Consequences

- Vertical slicing is the *arrangement*, not the cure for duplication — single-source-of-truth (one copy in `packages/`) is the cure. De-duplication proceeds **slice by slice**: pin the concept, move the canonical copy into its slice, delete the four app copies, repoint imports. Each slice lands and is testable on its own.
- Slices can expose role-specific entry points (e.g. `leases` tenant-view vs landlord-view) so different app shells consume the same slice differently.
- A concept with competing tables (Lease Agreement, Maintenance Request — see `CONTEXT.md`) cannot be cleanly sliced until its schema is unified; that unification gates those slices.
