-- Fix security issues for functions by setting proper search_path

DROP FUNCTION IF EXISTS add_lease_audit_entry(UUID, TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION add_lease_audit_entry(
  contract_id UUID,
  action TEXT,
  actor_id UUID,
  details JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  UPDATE public.lease_contracts
  SET audit_trail = audit_trail || jsonb_build_array(
    jsonb_build_object(
      'timestamp', NOW(),
      'action', action,
      'actor_id', actor_id,
      'details', details
    )
  )
  WHERE id = contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;