-- application_requests.tenant_id/landlord_id were FK'd to profiles(id), but
-- the RLS policies (auth.uid() = tenant_id) and every caller store auth user
-- ids (= profiles.user_id, which is unique). The two constraints contradicted
-- each other, so creating a manual application request always failed with a
-- foreign-key violation. Repoint the FKs at profiles(user_id) to match the
-- policies and the code.
ALTER TABLE public.application_requests
  DROP CONSTRAINT IF EXISTS application_requests_tenant_id_fkey,
  DROP CONSTRAINT IF EXISTS application_requests_landlord_id_fkey;

ALTER TABLE public.application_requests
  ADD CONSTRAINT application_requests_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT application_requests_landlord_id_fkey
    FOREIGN KEY (landlord_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
