# Deploys the affordability-assessment edge functions to Supabase.
#
# Prerequisites (one-time):
#   1. npx supabase login            # interactive; opens a browser
#   2. (optional) npx supabase link --project-ref rsfrvjaqxhoqavvscvwf
#
# Then run:  powershell -ExecutionPolicy Bypass -File scripts/deploy-affordability.ps1

$ErrorActionPreference = "Stop"
$ref = "rsfrvjaqxhoqavvscvwf"

# Functions that require a valid user JWT (called from the app with the tenant's/
# landlord's auth token). JWT verification stays ON (the default).
$authed = @(
  "affordability-consent",
  "affordability-upload",
  "affordability-documents",
  "affordability-process",
  "affordability-review",
  "affordability-correction"
)

foreach ($fn in $authed) {
  Write-Host "Deploying $fn ..." -ForegroundColor Cyan
  npx supabase functions deploy $fn --project-ref $ref
}

# Retention is invoked by the scheduler with the x-cron-secret header (no user
# JWT), so JWT verification must be disabled for it — it enforces its own secret.
Write-Host "Deploying affordability-retention (no JWT verify) ..." -ForegroundColor Cyan
npx supabase functions deploy affordability-retention --project-ref $ref --no-verify-jwt

Write-Host ""
Write-Host "Done. Remaining manual steps:" -ForegroundColor Green
Write-Host "  1) Set the retention secret:"
Write-Host "       npx supabase secrets set AFFORDABILITY_CRON_SECRET=<random-value> --project-ref $ref"
Write-Host "  2) Schedule a daily call to affordability-retention with header x-cron-secret: <that value>"
Write-Host "       (Supabase Dashboard -> Edge Functions -> Schedules, or an external cron)."
Write-Host "  3) Rebuild/redeploy the tenant + landlord web apps so the wired UI ships."
