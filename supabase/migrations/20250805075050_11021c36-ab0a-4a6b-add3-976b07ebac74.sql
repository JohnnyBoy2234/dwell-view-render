-- Fix foreign key relationships between tenancies and profiles

-- First, drop the existing foreign key constraints that reference auth.users
ALTER TABLE public.tenancies 
DROP CONSTRAINT IF EXISTS fk_tenancies_tenant,
DROP CONSTRAINT IF EXISTS fk_tenancies_landlord;

-- Add proper foreign key constraints that reference profiles table
-- Note: tenant_id and landlord_id in tenancies should match user_id in profiles
ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_tenant_profile
FOREIGN KEY (tenant_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_landlord_profile  
FOREIGN KEY (landlord_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Also fix the property foreign key relationship
ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_property_ref
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;