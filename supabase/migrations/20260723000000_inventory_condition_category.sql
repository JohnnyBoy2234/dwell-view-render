-- Add condition + category to the landlord-managed property inventory so the
-- tenant Inventory module can show a condition summary chart, condition badges
-- and category filters. Condition here describes the item as the landlord
-- recorded it when supplying it with the property — it is NOT the tenant-driven
-- inspection flow, which continues to live in condition_records.
--
-- Tenant access stays strictly read-only: the existing RLS policies on this
-- table (landlord full access, tenant SELECT only) are unchanged, so tenants
-- still cannot write condition or any other column.

alter table public.property_inventory_items
  add column if not exists condition text not null default 'unknown'
    check (condition in ('good', 'needs_attention', 'not_working', 'unknown')),
  add column if not exists category text;
