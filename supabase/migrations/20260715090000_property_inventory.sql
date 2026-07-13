-- Official property inventory: a landlord-created list of furniture, keys and
-- equipment belonging to the property. Tenants get read-only access. Condition
-- documentation lives in the separate condition_records feature — this table
-- deliberately has no condition/photo/approval columns.

create table if not exists public.property_inventory_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room text not null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  description text,
  serial_number text,
  brand_model text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_property_inventory_items_property
  on public.property_inventory_items(property_id);

alter table public.property_inventory_items enable row level security;

create policy "Landlords manage their property inventory"
  on public.property_inventory_items
  for all
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_inventory_items.property_id
        and p.landlord_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_inventory_items.property_id
        and p.landlord_id = auth.uid()
    )
  );

create policy "Tenants can view their property inventory"
  on public.property_inventory_items
  for select
  using (
    exists (
      select 1 from public.tenancies t
      where t.property_id = property_inventory_items.property_id
        and t.tenant_id = auth.uid()
        and t.status = 'active'
    )
    -- Same linkage the tenant dashboard uses: an active tenancy, or a lease
    -- that is signed or awaiting the tenant's signature.
    or exists (
      select 1 from public.lease_contracts lc
      where lc.property_id = property_inventory_items.property_id
        and lc.tenant_id = auth.uid()
        and lc.status in ('signed', 'pending_tenant')
    )
  );

create trigger update_property_inventory_items_updated_at
  before update on public.property_inventory_items
  for each row execute function public.update_updated_at_column();

-- Legacy inventory_records/inventory_items were a tenant-driven condition
-- capture flow (photos, voice notes, condition ratings, landlord approval).
-- That responsibility now belongs to condition_records. Existing rows are
-- preserved as historical evidence (both parties keep SELECT access), but
-- tenants can no longer create or modify them.
drop policy if exists "Tenants can create inventory records for their properties" on public.inventory_records;
drop policy if exists "Tenants can update their own inventory records" on public.inventory_records;
drop policy if exists "Tenants can manage inventory items for their records" on public.inventory_items;
