-- Deleting a property previously cascade-deleted its conversations, which
-- cascade-deleted their messages — but messages are a deliberate, separate
-- "permanent record" (enforce_message_immutability() hard-blocks DELETE on
-- messages with "Messages are a permanent record and cannot be deleted").
-- The result: any property with chat history could never be deleted at all,
-- surfacing as a confusing message-immutability error from deep in the
-- cascade. Preserve the conversation/message history and just disconnect it
-- from the deleted property instead.

alter table public.conversations
  alter column property_id drop not null;

alter table public.conversations
  drop constraint if exists conversations_property_id_fkey;

alter table public.conversations
  add constraint conversations_property_id_fkey
  foreign key (property_id) references public.properties(id) on delete set null;

-- admin_delete_property no longer needs to (and must not) explicitly delete
-- conversations — the FK above now orphans them automatically when the
-- property row is deleted, instead of cascading into the blocked message
-- delete. Every other explicit cleanup step is unchanged.
create or replace function public.admin_delete_property(property_id_to_delete uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Only admins can use this function';
  END IF;

  -- Verify property exists
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = property_id_to_delete) THEN
    RAISE EXCEPTION 'Property does not exist';
  END IF;

  -- Delete related data in order (respecting foreign key constraints)
  -- Note: We delete explicitly to ensure all related data is removed, even if CASCADE is missing

  -- Delete signature_audit (references lease_contracts, which references properties)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'signature_audit') THEN
    DELETE FROM public.signature_audit
    WHERE lease_contract_id IN (SELECT id FROM public.lease_contracts WHERE property_id = property_id_to_delete);
  END IF;

  -- Delete lease_contracts (references properties without CASCADE)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lease_contracts') THEN
    DELETE FROM public.lease_contracts WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete offers (listing_id references properties - may not have CASCADE)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offers') THEN
    DELETE FROM public.offers WHERE listing_id = property_id_to_delete;
  END IF;

  -- Delete transactions (they use SET NULL, so we delete them explicitly)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    DELETE FROM public.transactions WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete additional_costs (references property_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'additional_costs') THEN
    DELETE FROM public.additional_costs WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete landlord invoices if they reference property_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'landlord_invoices') THEN
    DELETE FROM public.landlord_invoices WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete maintenance tickets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_tickets') THEN
    DELETE FROM public.maintenance_tickets WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete inventory records
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_records') THEN
    DELETE FROM public.inventory_records WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete inspection records
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspection_records') THEN
    DELETE FROM public.inspection_records WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete viewing slots
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'viewing_slots') THEN
    DELETE FROM public.viewing_slots WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete viewing proposals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'viewing_proposals') THEN
    DELETE FROM public.viewing_proposals WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete application requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'application_requests') THEN
    DELETE FROM public.application_requests WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete tenancies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenancies') THEN
    DELETE FROM public.tenancies WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete leases/lease_agreements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lease_agreements') THEN
    DELETE FROM public.lease_agreements WHERE property_id = property_id_to_delete;
  END IF;

  -- Delete leases (the original leases table)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leases') THEN
    DELETE FROM public.leases WHERE property_id = property_id_to_delete;
  END IF;

  -- Conversations/messages are intentionally NOT deleted here (see migration
  -- 20261107120000): messages are a permanent record that can never be
  -- deleted, so conversations.property_id now ON DELETE SET NULL instead —
  -- they're orphaned, not removed, when the property row is deleted below.

  -- Delete inquiries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries') THEN
    DELETE FROM public.inquiries WHERE property_id = property_id_to_delete;
  END IF;

  -- Finally, delete the property itself
  DELETE FROM public.properties WHERE id = property_id_to_delete;

END;
$function$;
