-- Create application_invites table for landlord-initiated application workflow
create table if not exists public.application_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  property_id uuid not null,
  landlord_id uuid not null,
  tenant_id uuid not null,
  conversation_id uuid,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz
);

-- Enable RLS
alter table public.application_invites enable row level security;

-- Policies
create policy "Landlords can create invites" on public.application_invites
for insert to authenticated
with check (auth.uid() = landlord_id);

create policy "Landlords can view invites for their properties" on public.application_invites
for select to authenticated
using (auth.uid() = landlord_id);

create policy "Tenants can view their invites" on public.application_invites
for select to authenticated
using (auth.uid() = tenant_id);

create policy "Tenants or landlords can update their invites" on public.application_invites
for update to authenticated
using (auth.uid() = tenant_id or auth.uid() = landlord_id)
with check (auth.uid() = tenant_id or auth.uid() = landlord_id);

-- Helpful index for token lookups
create index if not exists idx_application_invites_token on public.application_invites (token);
