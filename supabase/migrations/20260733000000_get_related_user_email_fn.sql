-- A landlord can't read a tenant's email from the client (it lives in
-- auth.users). Expose it via a SECURITY DEFINER RPC, but only to the tenant
-- themselves or a landlord who has a lease / application / tenancy / invite
-- relationship with them (so the lease wizard can prefill the tenant email).
create or replace function public.get_related_user_email(p_user_id uuid)
returns text
language plpgsql stable security definer set search_path = public, auth as $$
declare v_caller uuid := auth.uid(); v_email text;
begin
  if v_caller is null then return null; end if;
  if v_caller <> p_user_id and not public.is_admin(v_caller) and not exists (
    select 1 from public.lease_contracts lc where lc.landlord_id = v_caller and lc.tenant_id = p_user_id
    union all select 1 from public.application_requests ar where ar.landlord_id = v_caller and ar.tenant_id = p_user_id
    union all select 1 from public.tenancies t where t.landlord_id = v_caller and t.tenant_id = p_user_id
    union all select 1 from public.application_invites ai where ai.landlord_id = v_caller and ai.tenant_id = p_user_id
  ) then
    return null;
  end if;
  select email into v_email from auth.users where id = p_user_id;
  return v_email;
end; $$;

grant execute on function public.get_related_user_email(uuid) to authenticated;
