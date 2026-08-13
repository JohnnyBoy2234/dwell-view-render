#!/usr/bin/env bash
# Deploys the affordability-assessment edge functions to Supabase.
#
# Prerequisites (one-time):
#   1. npx supabase login            # interactive; opens a browser
#   2. (optional) npx supabase link --project-ref rsfrvjaqxhoqavvscvwf
#
# Then run:  bash scripts/deploy-affordability.sh
set -euo pipefail
REF="rsfrvjaqxhoqavvscvwf"

# Require a valid user JWT (called from the app with the user's auth token).
for fn in \
  affordability-consent \
  affordability-upload \
  affordability-documents \
  affordability-process \
  affordability-review \
  affordability-correction
do
  echo "Deploying $fn ..."
  npx supabase functions deploy "$fn" --project-ref "$REF"
done

# Called by the scheduler with x-cron-secret (no user JWT) -> disable JWT verify.
echo "Deploying affordability-retention (no JWT verify) ..."
npx supabase functions deploy affordability-retention --project-ref "$REF" --no-verify-jwt

cat <<'NEXT'

Done. Remaining manual steps:
  1) npx supabase secrets set AFFORDABILITY_CRON_SECRET=<random-value> --project-ref rsfrvjaqxhoqavvscvwf
  2) Schedule a daily call to affordability-retention with header  x-cron-secret: <that value>
  3) Rebuild/redeploy the tenant + landlord web apps.
NEXT
