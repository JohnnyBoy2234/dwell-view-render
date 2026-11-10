-- Critical fix: "System can upload/update" storage policies were scoped to
-- role `public` with no auth check at all — anyone, unauthenticated, could
-- upload or overwrite files in these buckets. The generating edge functions
-- (generate-lease-pdf, generate-rent-receipt, pay-monthly-bill, etc.) use the
-- service-role key, which bypasses storage RLS natively and needs no policy.
drop policy if exists "System can upload lease documents" on storage.objects;
drop policy if exists "System can update lease documents" on storage.objects;
drop policy if exists "System can upload rent receipts" on storage.objects;
drop policy if exists "System can update rent receipts" on storage.objects;

-- rent-receipts: flip from public to private. The old "Public can view rent
-- receipts" policy was bucket-wide with no ownership check, and the bucket's
-- public flag bypassed RLS entirely for direct-URL reads — so every tenant's
-- rent receipt and every landlord's invoice was reachable by anyone. Replace
-- with a policy scoped to the specific bill's tenant/landlord, resolved from
-- the file path convention `<landlord_id>/receipt_<period>_<bill_id>.pdf` /
-- `<landlord_id>/invoice_<period>_<bill_id>.pdf`.
update storage.buckets set public = false where id = 'rent-receipts';

drop policy if exists "Public can view rent receipts" on storage.objects;
create policy "Parties can view their own rent receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rent-receipts'
  and exists (
    select 1 from public.monthly_bills mb
    where mb.id = substring(storage.objects.name from '_([0-9a-fA-F-]{36})\.pdf$')::uuid
      and (mb.landlord_id = auth.uid() or mb.tenant_id = auth.uid())
  )
);
