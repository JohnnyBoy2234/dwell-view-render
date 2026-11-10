-- Critical fix: several RLS policies were written for role `public` with
-- qual/with_check `true`, intended for service-role backend writes but never
-- scoped to service_role (which bypasses RLS natively and needs no policy).

-- payments: anyone (incl. unauthenticated) could read/write/delete any row.
drop policy if exists "System can manage payments" on public.payments;

-- email_verification_tokens: anyone could read/write/delete any token.
drop policy if exists "System can manage verification tokens" on public.email_verification_tokens;

-- kyc_capture_sessions: anyone could tamper with any other user's live KYC session.
drop policy if exists "System can update capture sessions" on public.kyc_capture_sessions;
create policy "Users can update their own capture sessions"
on public.kyc_capture_sessions
for update
to public
using (auth.uid() = desktop_user_id)
with check (auth.uid() = desktop_user_id);

-- property_invites: SELECT exposed every unused invite (landlord, property,
-- tenant, token) to anon+authenticated via `used_at IS NULL`. Replace with a
-- policy scoped to the invite's own tenant; landlord access is already
-- covered by the existing "landlord_manage_invites" ALL policy. Anonymous
-- pre-signup lookup now goes through the get_invite_by_token() RPC instead
-- (see companion migration) rather than direct table access.
drop policy if exists "public_read_invite_by_token" on public.property_invites;
create policy "Tenants can view invites addressed to them"
on public.property_invites
for select
to authenticated
using (tenant_id = auth.uid());

-- property_invites UPDATE ("tenant_accept_invite"): only checked `used_at IS
-- NULL`, not that the invite belongs to the caller — any authenticated user
-- could claim any other tenant's pending invite. Require the invite to be
-- unclaimed (tenant_id IS NULL) or already theirs.
drop policy if exists "tenant_accept_invite" on public.property_invites;
create policy "tenant_accept_invite"
on public.property_invites
for update
to authenticated
using (used_at is null and (tenant_id is null or tenant_id = auth.uid()))
with check (tenant_id = auth.uid());

-- tenancies ("Tenants can accept invites"): only checked that *some* open
-- invite existed for the property+landlord pair (both publicly knowable from
-- listings), not that it was meant for this caller. Require the matching
-- invite to be unclaimed or already assigned to the caller.
drop policy if exists "Tenants can accept invites" on public.tenancies;
create policy "Tenants can accept invites"
on public.tenancies
for insert
to public
with check (
  auth.uid() = tenant_id
  and exists (
    select 1 from public.property_invites pi
    where pi.property_id = tenancies.property_id
      and pi.landlord_id = tenancies.landlord_id
      and pi.used_at is null
      and (pi.tenant_id is null or pi.tenant_id = auth.uid())
  )
);
