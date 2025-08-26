# DocuSign Cutover Plan

## Feature Flags
- SIGN_PROVIDER=legacy|docusign (frontend: VITE_SIGN_PROVIDER)
- SIGN_PROVIDER_FORCE_LEGACY=false (frontend: VITE_SIGN_PROVIDER_FORCE_LEGACY)

## Rollout Steps
1. Ship with legacy default (no behavior change).
2. Enable DocuSign in staging (VITE_SIGN_PROVIDER=docusign), run E2E.
3. Canary with internal users or a subset of new leases.
4. Full cutover.
5. Instant rollback: set provider back to legacy.

## Backward Compatibility
- Existing leases remain on legacy until completion.
- New leases follow current env default.

## Monitoring
- Log normalized events without PII.
- Verify webhook idempotency and status transitions.
