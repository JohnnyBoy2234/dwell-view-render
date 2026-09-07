-- Landlord signing failed with 22007 "invalid input syntax for type date: ''"
-- for month-to-month leases: leaseEndDate is an empty string "", and
-- COALESCE(('')::date, ...) still errors because the ''::date cast throws
-- BEFORE COALESCE can substitute the default. Guard every text->date/numeric
-- cast with NULLIF(...,'') so empty strings fall through to the default.
CREATE OR REPLACE FUNCTION public.create_tenancy_from_signed_lease()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      COALESCE(NULLIF(NEW.contract_data->>'leaseStartDate', '')::date, CURRENT_DATE),
      COALESCE(NULLIF(NEW.contract_data->>'leaseEndDate', '')::date, CURRENT_DATE + INTERVAL '1 year'),
      COALESCE(NULLIF(NEW.contract_data->>'rentAmount', '')::numeric, 0),
      COALESCE(NULLIF(NEW.contract_data->>'depositAmount', '')::numeric, 0),
      'active'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenancies
      WHERE property_id = NEW.property_id AND tenant_id = NEW.tenant_id AND status = 'active'
    );
  END IF;
  RETURN NEW;
END;
$function$;
