-- High/Medium fixes, same root cause as the Critical pass: several policies
-- intended for backend/service-role writes were written against role
-- `public` with `qual`/`with_check` true instead of being left to the
-- service-role RLS bypass. Each table below already has (or now gets) a
-- correctly-scoped policy covering the real client-side use case.

-- kyc_audit: audit trail was forgeable by any user.
drop policy if exists "Service role can insert audit logs" on public.kyc_audit;

-- notifications: any user could spoof a notification to any other user_id.
-- "Users can insert notifications" (user_id = auth.uid()) already covers the
-- legitimate self-insert case.
drop policy if exists "System can create notifications for any user" on public.notifications;

-- events / inventory_reports / workflow_runs / signature_audit /
-- viewing_reminders: arbitrary row injection by any caller, no app code
-- actually inserts into these client-side (all writes are triggers/edge
-- functions via service role, confirmed by repo-wide search).
drop policy if exists "System can insert events" on public.events;
drop policy if exists "System can create inventory reports" on public.inventory_reports;
drop policy if exists "System can insert workflow runs" on public.workflow_runs;
drop policy if exists "System can insert audit logs" on public.signature_audit;
drop policy if exists "System can manage reminders" on public.viewing_reminders;

-- tenant_invites: legacy table, zero references in the current app. The
-- broad "any authenticated user can read every invite" policy had no
-- legitimate caller; the landlord-scoped policy remains.
drop policy if exists "Authenticated users can view invites by token" on public.tenant_invites;

-- user_roles: two separate qual=true policies exposed every user's role
-- platform-wide. "Users can view own roles" + "Admins can manage all roles"
-- + the service-role policy already cover every legitimate case.
drop policy if exists "Enable read access for authenticated users" on public.user_roles;
drop policy if exists "Users can view all roles" on public.user_roles;

-- leases: a second, looser INSERT policy dropped the property-ownership
-- check from "Landlords can create leases for their properties", letting a
-- landlord fabricate a lease against a property they don't own.
drop policy if exists "Landlords can insert leases" on public.leases;

-- lease_agreements: legacy fallback table (see TenantLeaseDocuments.tsx
-- comment "Fallback to legacy lease_agreements table") with no INSERT call
-- site anywhere in the app. The old FOR-ALL tenant policy let a tenant
-- insert/alter arbitrary lease terms with no lock. Replace with read-only
-- for tenants, and landlord writes gated by property ownership + the
-- existing `immutable` flag.
drop policy if exists "Tenants can view and update their lease agreements" on public.lease_agreements;
drop policy if exists "Landlords can manage their lease agreements" on public.lease_agreements;

create policy "Tenants can view their lease agreements"
on public.lease_agreements
for select
to public
using (auth.uid() = tenant_id);

create policy "Landlords can view their lease agreements"
on public.lease_agreements
for select
to public
using (auth.uid() = landlord_id);

create policy "Landlords can insert their lease agreements"
on public.lease_agreements
for insert
to public
with check (
  auth.uid() = landlord_id
  and exists (select 1 from public.properties p where p.id = lease_agreements.property_id and p.landlord_id = auth.uid())
);

create policy "Landlords can update their unlocked lease agreements"
on public.lease_agreements
for update
to public
using (auth.uid() = landlord_id and coalesce(immutable, false) = false)
with check (auth.uid() = landlord_id);

create policy "Landlords can delete their unlocked lease agreements"
on public.lease_agreements
for delete
to public
using (auth.uid() = landlord_id and coalesce(immutable, false) = false);

-- check_user_gate_status: returned any user's email-verified/KYC status by
-- UUID with no check that the caller was asking about themselves.
create or replace function public.check_user_gate_status(_user_id uuid)
returns table(user_id uuid, email_verified boolean, kyc_status text, can_request_viewing boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    _user_id,
    (
      SELECT u.email_confirmed_at IS NOT NULL
      FROM auth.users u
      WHERE u.id = _user_id
    ) AS email_verified,
    COALESCE(k.status::text, 'not_started') AS kyc_status,
    (
      (SELECT u.email_confirmed_at IS NOT NULL FROM auth.users u WHERE u.id = _user_id)
      AND
      COALESCE(k.status, 'not_started') = 'approved'
    ) AS can_request_viewing
  FROM (SELECT _user_id AS id) AS base_user
  LEFT JOIN public.kyc_profiles k ON k.user_id = _user_id;
END;
$function$;

-- create_admin_account: dead code (zero call sites anywhere in the app) that
-- was also non-functional by its own comment ("For demo purposes... In
-- production, this would integrate with Supabase Auth Admin API") — it
-- created an orphaned profile/role not tied to any real auth.users row.
drop function if exists public.create_admin_account(text, text);

-- function_search_path_mutable: pin search_path on the two flagged functions.
create or replace function public.mask_id(p_id text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case
    when p_id is null or p_id = '' then p_id
    when p_id like 'enc:v1:%' then '••••••'
    when length(p_id) <= 4 then p_id
    else repeat('•', length(p_id) - 4) || right(p_id, 4)
  end;
$function$;

create or replace function public.enforce_message_immutability()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Messages are a permanent record and cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'read_by_landlord' - 'read_by_tenant' - 'delivered_at' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'read_by_landlord' - 'read_by_tenant' - 'delivered_at' - 'updated_at') THEN
    RAISE EXCEPTION 'Message content is immutable; only receipt status may change';
  END IF;
  RETURN NEW;
END;
$function$;

-- Note: extension_in_public (pg_net) was attempted here via
-- `alter extension pg_net set schema extensions` but Postgres rejects it —
-- pg_net does not support SET SCHEMA. Left in public; low-severity hygiene
-- item, not a real access-control gap.
