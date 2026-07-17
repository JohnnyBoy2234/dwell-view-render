-- Replace direct signature_audit table access with a SECURITY DEFINER function
-- that strips PII (ip_address, geolocation, user_agent, signature_hash) and is
-- scoped to either party on the lease contract, not just the row's own signer.
--
-- Previously RLS was `auth.uid() = signer_id`, so each party could only ever
-- see their own signing row (never leaking the other party's IP/geolocation),
-- but that also meant the "Audit Trail" UI could never show the counterparty's
-- signing event. Broadening that policy to `auth.uid() IN (landlord_id, tenant_id)`
-- would have fixed the visibility gap but reintroduced the PII leak. This
-- function fixes the visibility gap without exposing PII to either party.

CREATE OR REPLACE FUNCTION public.get_lease_audit_trail(p_contract_id uuid)
RETURNS TABLE (signer_role text, "timestamp" timestamptz, consent_method text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lease_contracts lc
    WHERE lc.id = p_contract_id
      AND auth.uid() IN (lc.landlord_id, lc.tenant_id)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT sa.signer_role, sa.timestamp, sa.consent_method
  FROM public.signature_audit sa
  WHERE sa.lease_contract_id = p_contract_id
  ORDER BY sa.timestamp ASC;
END;
$$;

-- Supabase's default privileges auto-grant EXECUTE on new public-schema
-- functions to anon as well as PUBLIC; revoke both so only authenticated
-- users (who then still hit the auth.uid() check above) can call it.
REVOKE EXECUTE ON FUNCTION public.get_lease_audit_trail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lease_audit_trail(uuid) TO authenticated;

REVOKE SELECT ON public.signature_audit FROM authenticated, anon;
