-- Critical fix: decrypt_pii/encrypt_pii had no caller-authorization check and
-- were executable by anon+authenticated, letting anyone decrypt any PII
-- ciphertext they got hold of, bypassing the relationship checks built into
-- get_id_number(). get_id_number() keeps working because it runs as the
-- function owner (postgres), which retains implicit execute rights.
revoke execute on function public.decrypt_pii(text) from public, anon, authenticated;
revoke execute on function public.encrypt_pii(text) from public, anon, authenticated;

-- Critical fix: handle_new_user() trusted client-supplied signup metadata
-- (raw_user_meta_data->>'role') to assign the initial role, including
-- 'admin' — anyone could sign up as admin by setting that field themselves.
-- Everyone now always starts as 'tenant'; landlord self-upgrade goes through
-- the existing promote_to_landlord() RPC, admin only through the admin-gated
-- create_admin_account() path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'display_name',
      split_part(NEW.email, '@', 1)
    )
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'tenant'::user_role);

  RETURN NEW;
END;
$function$;

-- Companion for the property_invites RLS fix: lets an unauthenticated
-- visitor who already holds a specific invite token look up that one row
-- (the pre-signup "join property" link flow), without exposing the table's
-- full contents the way the old SELECT policy did.
create or replace function public.get_invite_by_token(p_token text)
returns table (
  id uuid, property_id uuid, landlord_id uuid, token text,
  monthly_rent numeric, lease_start date, lease_end date,
  used_at timestamptz, tenant_id uuid, created_at timestamptz, invitee_name text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select id, property_id, landlord_id, token, monthly_rent, lease_start, lease_end,
         used_at, tenant_id, created_at, invitee_name
  from public.property_invites
  where token = p_token
  limit 1;
$$;

revoke all on function public.get_invite_by_token(text) from public;
grant execute on function public.get_invite_by_token(text) to anon, authenticated;
