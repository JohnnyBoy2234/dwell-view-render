-- §7: unify tenant "request to apply" and landlord "invite to apply" into one
-- access state per (property, tenant, landlord), and prevent duplicates.

-- 1. Prevent a landlord from sending a second *active* invite for the same
--    tenant + property (requests already have a unique (property,tenant) index).
--    Partial so a fresh invite is allowed after a decline/use.
do $$ begin
  delete from public.application_invites a
  using public.application_invites b
  where a.status = 'invited' and b.status = 'invited'
    and a.property_id = b.property_id and a.tenant_id = b.tenant_id
    and a.ctid < b.ctid;
exception when others then null; end $$;

create unique index if not exists uq_active_invite_property_tenant
  on public.application_invites (property_id, tenant_id)
  where status = 'invited';

-- 2. Unified access-status for a (property, tenant). Most-advanced state wins so
--    both dashboards can render the correct linked state (§7.1/§7.2/§7.3).
create or replace function public.application_access_status(p_property uuid, p_tenant uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case a.status
              when 'submitted' then 'application_submitted'
              when 'withdrawn' then 'application_withdrawn'
              when 'pending'   then 'application_started'
              when 'accepted'  then 'application_submitted'
              else null end
       from public.applications a
      where a.property_id = p_property and a.tenant_id = p_tenant
      order by a.updated_at desc nulls last limit 1),
    (select 'application_started'
       from public.application_drafts d
      where d.property_id = p_property and d.tenant_id = p_tenant limit 1),
    (select case ai.status
              when 'invited'  then 'landlord_invited'
              when 'accepted' then 'invitation_accepted'
              when 'declined' then 'invitation_declined'
              else null end
       from public.application_invites ai
      where ai.property_id = p_property and ai.tenant_id = p_tenant
      order by ai.created_at desc limit 1),
    (select case ar.status
              when 'pending'  then 'tenant_requested'
              when 'approved' then 'approved_to_apply'
              when 'rejected' then 'request_declined'
              else null end
       from public.application_requests ar
      where ar.property_id = p_property and ar.tenant_id = p_tenant
      order by ar.updated_at desc nulls last limit 1),
    'none'
  );
$$;

grant execute on function public.application_access_status(uuid, uuid) to authenticated;
