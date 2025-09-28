-- Function to add lease audit entry (if not exists)
CREATE OR REPLACE FUNCTION public.add_lease_audit_entry(
  contract_id UUID,
  action TEXT,
  actor_id UUID,
  details JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;