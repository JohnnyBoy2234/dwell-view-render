-- Relax application access: allow valid invites to submit applications
-- Update can_access_application to consider application_invites
CREATE OR REPLACE FUNCTION public.can_access_application(property_uuid uuid, tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    EXISTS (
      SELECT 1
      FROM public.viewings v
      WHERE v.property_id = property_uuid
        AND v.tenant_id = tenant_uuid
        AND v.viewing_confirmed = TRUE
        AND v.application_sent = TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM public.application_invites ai
      WHERE ai.property_id = property_uuid
        AND ai.tenant_id = tenant_uuid
        AND ai.status IN ('invited', 'accepted')
        AND ai.expires_at > now()
    );
$function$;