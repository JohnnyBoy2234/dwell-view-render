CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- PREREQUISITE (manual, per environment — not created by this migration):
--   Vault secrets 'project_url' and 'service_role_key' must exist.
--   On a fresh/branch DB these are absent → net.http_post fires with a NULL url
--   and fails SILENTLY (cron.job_run_details shows success; the real error lands
--   in net._http_response). Seed the vault before relying on the schedule.
--
-- Fire-and-forget: the HTTP outcome is in net._http_response (status_code), NOT in
-- cron.job_run_details. Unmonitored by design — the 3-day billing window plus
-- idempotent inserts in the billing-cycle function self-heal a missed or failed day.
--
-- 05:00 UTC = 07:00 SAST daily
SELECT cron.schedule(
  'billing-cycle-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/billing-cycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
