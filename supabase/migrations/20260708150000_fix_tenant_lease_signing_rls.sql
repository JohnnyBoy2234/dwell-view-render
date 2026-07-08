-- Fix: tenants could never actually sign a lease contract.
--
-- "Tenants can update signature data" had no WITH CHECK, so Postgres reused
-- its USING clause (tenant_signed_at IS NULL) to validate the row *after*
-- the update too -- but signing is exactly the update that sets
-- tenant_signed_at to non-null, so every real signing attempt was rejected
-- with "new row violates row-level security policy for table lease_contracts".
DROP POLICY IF EXISTS "Tenants can update signature data" ON public.lease_contracts;
CREATE POLICY "Tenants can update signature data" ON public.lease_contracts
  FOR UPDATE
  USING (auth.uid() = tenant_id AND tenant_signed_at IS NULL)
  WITH CHECK (auth.uid() = tenant_id);

-- Fix: once a contract becomes fully signed, no one ever created the
-- tenancy record linking the tenant to the property. The frontend tried to
-- insert into `tenancies` directly as the tenant, but tenants have no
-- INSERT policy there (only landlords do), so it always failed RLS -- and
-- the failure was silently swallowed by a try/catch. It also trusted
-- client-submitted rent/deposit/date values instead of the signed contract.
-- Move this server-side: a trigger creates the tenancy from the contract's
-- own data the moment both signatures are present.
CREATE OR REPLACE FUNCTION public.create_tenancy_from_signed_lease()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'signed'
     AND (OLD.status IS DISTINCT FROM 'signed')
     AND NEW.property_id IS NOT NULL
     AND NEW.tenant_id IS NOT NULL
  THEN
    INSERT INTO public.tenancies (
      property_id, tenant_id, landlord_id,
      start_date, end_date, monthly_rent, security_deposit, status
    )
    SELECT
      NEW.property_id, NEW.tenant_id, NEW.landlord_id,
      COALESCE((NEW.contract_data->>'leaseStartDate')::date, CURRENT_DATE),
      COALESCE((NEW.contract_data->>'leaseEndDate')::date, CURRENT_DATE + INTERVAL '1 year'),
      COALESCE((NEW.contract_data->>'rentAmount')::numeric, 0),
      COALESCE((NEW.contract_data->>'depositAmount')::numeric, 0),
      'active'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenancies
      WHERE property_id = NEW.property_id AND tenant_id = NEW.tenant_id AND status = 'active'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_create_tenancy_from_signed_lease ON public.lease_contracts;
CREATE TRIGGER trg_create_tenancy_from_signed_lease
  AFTER UPDATE ON public.lease_contracts
  FOR EACH ROW EXECUTE FUNCTION public.create_tenancy_from_signed_lease();
