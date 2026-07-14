-- Inventory: landlord photographs items, tenant reviews and approves.

-- 1) Photos on inventory items
ALTER TABLE public.property_inventory_items
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- 2) Tenant approval of the property inventory (one row per tenant+property;
--    re-approval after landlord changes updates approved_at)
CREATE TABLE IF NOT EXISTS public.inventory_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, tenant_id)
);

ALTER TABLE public.inventory_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants manage their inventory approval" ON public.inventory_approvals;
CREATE POLICY "Tenants manage their inventory approval"
ON public.inventory_approvals FOR ALL
USING (auth.uid() = tenant_id)
WITH CHECK (
  auth.uid() = tenant_id AND (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      WHERE t.property_id = inventory_approvals.property_id
        AND t.tenant_id = auth.uid() AND t.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.lease_contracts lc
      WHERE lc.property_id = inventory_approvals.property_id
        AND lc.tenant_id = auth.uid() AND lc.status IN ('signed', 'pending_tenant')
    )
  )
);

DROP POLICY IF EXISTS "Landlords view inventory approvals" ON public.inventory_approvals;
CREATE POLICY "Landlords view inventory approvals"
ON public.inventory_approvals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = inventory_approvals.property_id AND p.landlord_id = auth.uid()
  )
);

-- 3) Storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-images', 'inventory-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated upload inventory images" ON storage.objects;
CREATE POLICY "Authenticated upload inventory images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inventory-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read inventory images" ON storage.objects;
CREATE POLICY "Public read inventory images"
ON storage.objects FOR SELECT
USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Owners delete inventory images" ON storage.objects;
CREATE POLICY "Owners delete inventory images"
ON storage.objects FOR DELETE
USING (bucket_id = 'inventory-images' AND owner = auth.uid());
