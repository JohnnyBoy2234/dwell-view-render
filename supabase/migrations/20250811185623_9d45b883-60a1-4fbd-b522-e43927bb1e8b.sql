-- Function to check if tenant has active booking for a property
CREATE OR REPLACE FUNCTION public.has_active_booking(property_uuid uuid, tenant_uuid uuid)
RETURNS TABLE(
  has_booking boolean,
  slot_id uuid,
  start_time timestamp with time zone,
  end_time timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    COUNT(*) > 0 as has_booking,
    vs.id as slot_id,
    vs.start_time,
    vs.end_time
  FROM viewing_slots vs
  WHERE vs.property_id = property_uuid
    AND vs.booked_by_tenant_id = tenant_uuid
    AND vs.status = 'booked'
    AND vs.start_time > now() -- Only future bookings
  GROUP BY vs.id, vs.start_time, vs.end_time
  ORDER BY vs.start_time ASC
  LIMIT 1;
$function$;

-- Function to cancel a viewing booking
CREATE OR REPLACE FUNCTION public.cancel_viewing_booking(slot_uuid uuid, tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE viewing_slots
  SET 
    status = 'available',
    booked_by_tenant_id = NULL,
    updated_at = now()
  WHERE id = slot_uuid
    AND booked_by_tenant_id = tenant_uuid
    AND status = 'booked'
    AND start_time > now(); -- Only allow cancelling future bookings
  
  RETURN FOUND;
END;
$function$;

-- Function to update viewing booking (cancel old + book new)
CREATE OR REPLACE FUNCTION public.update_viewing_booking(
  old_slot_uuid uuid, 
  new_slot_uuid uuid, 
  tenant_uuid uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  property_uuid uuid;
BEGIN
  -- Get property_id from old slot
  SELECT property_id INTO property_uuid
  FROM viewing_slots
  WHERE id = old_slot_uuid
    AND booked_by_tenant_id = tenant_uuid
    AND status = 'booked';
  
  IF property_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify new slot is available and for same property
  IF NOT EXISTS (
    SELECT 1 FROM viewing_slots
    WHERE id = new_slot_uuid
      AND property_id = property_uuid
      AND status = 'available'
      AND start_time > now()
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Cancel old booking
  UPDATE viewing_slots
  SET 
    status = 'available',
    booked_by_tenant_id = NULL,
    updated_at = now()
  WHERE id = old_slot_uuid;
  
  -- Book new slot
  UPDATE viewing_slots
  SET 
    status = 'booked',
    booked_by_tenant_id = tenant_uuid,
    updated_at = now()
  WHERE id = new_slot_uuid;
  
  RETURN TRUE;
END;
$function$;

-- Enhanced RLS policy to prevent multiple active bookings
DROP POLICY IF EXISTS "Tenants can book available slots" ON viewing_slots;

CREATE POLICY "Tenants can book available slots with restrictions"
ON viewing_slots
FOR UPDATE
USING (
  status = 'available' 
  AND start_time > now()
  AND NOT EXISTS (
    -- Prevent booking if tenant already has an active booking for this property
    SELECT 1 FROM viewing_slots existing
    WHERE existing.property_id = viewing_slots.property_id
      AND existing.booked_by_tenant_id = auth.uid()
      AND existing.status = 'booked'
      AND existing.start_time > now()
      AND existing.id != viewing_slots.id
  )
)
WITH CHECK (
  status = 'booked' 
  AND booked_by_tenant_id = auth.uid()
  AND start_time > now()
);

-- Policy for cancelling bookings
CREATE POLICY "Tenants can cancel their own future bookings"
ON viewing_slots
FOR UPDATE
USING (
  booked_by_tenant_id = auth.uid() 
  AND status = 'booked' 
  AND start_time > now()
)
WITH CHECK (
  (status = 'available' AND booked_by_tenant_id IS NULL) OR
  (status = 'booked' AND booked_by_tenant_id = auth.uid())
);