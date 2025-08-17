-- Ensure lease_status allows all workflow states used by the app
ALTER TABLE public.tenancies DROP CONSTRAINT IF EXISTS tenancies_lease_status_check;

ALTER TABLE public.tenancies
ADD CONSTRAINT tenancies_lease_status_check
CHECK (lease_status IN (
  'draft',
  'awaiting_tenant_signature',
  'awaiting_landlord_signature',
  'completed'
));