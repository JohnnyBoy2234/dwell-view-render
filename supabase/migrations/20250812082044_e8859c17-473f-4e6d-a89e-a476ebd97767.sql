-- 1) Add custom_clauses column to tenancies for storing selected clauses
ALTER TABLE public.tenancies
ADD COLUMN IF NOT EXISTS custom_clauses jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Optional: ensure lease_status column exists (already present) and we will use it for signing workflow statuses
-- No enum constraint is applied so acceptable values include:
-- 'draft', 'awaiting_tenant_signature', 'awaiting_landlord_signature', 'generated', 'completed'

-- 3) Add helpful indexes for frequent lookups by status
CREATE INDEX IF NOT EXISTS idx_tenancies_lease_status ON public.tenancies (lease_status);
CREATE INDEX IF NOT EXISTS idx_tenancies_property_tenant ON public.tenancies (property_id, tenant_id);
