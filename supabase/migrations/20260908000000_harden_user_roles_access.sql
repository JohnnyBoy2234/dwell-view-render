-- Harden public.user_roles access.
--
-- 1) Remove the permissive "view all roles" SELECT policy (USING true): any
--    authenticated user could enumerate every user's roles. Own-row reads
--    remain via "Users can view own roles"; admins retain full access via
--    "Admins can manage all roles" (FOR ALL). Service-role callers (edge
--    functions) bypass RLS and are unaffected.
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- 2) promote_to_landlord() is legitimate self-service: a user who lists a
--    property becomes a landlord. It only ever inserts the 'landlord' role for
--    auth.uid() (never admin), so it is not a trust-boundary escalation. Keep
--    it for authenticated users, but drop the implicit PUBLIC grant so
--    anonymous callers cannot invoke it.
REVOKE EXECUTE ON FUNCTION public.promote_to_landlord() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_landlord() TO authenticated;
