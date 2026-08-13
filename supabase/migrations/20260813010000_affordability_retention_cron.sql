-- Retention: mark affordability assessments as expired once past their expiry.
-- File + raw-data purge is performed by the `affordability-retention` edge
-- function (secret-protected), which should be scheduled to run daily. This
-- SQL cron keeps the UI/state accurate promptly without needing secrets in SQL.
select cron.schedule(
  'affordability-mark-expired-daily',
  '20 4 * * *',
  $$
    update public.affordability_assessments
    set status = 'expired'
    where expires_at is not null
      and expires_at < now()
      and status not in ('deleted', 'expired');
  $$
);
