-- Check and fix only the foreign key constraints that need fixing

-- Drop all existing foreign key constraints on tenancies table to start fresh
ALTER TABLE public.tenancies 
DROP CONSTRAINT IF EXISTS fk_tenancies_property,
DROP CONSTRAINT IF EXISTS fk_tenancies_property_ref,
DROP CONSTRAINT IF EXISTS fk_tenancies_tenant,
DROP CONSTRAINT IF EXISTS fk_tenancies_tenant_profile,
DROP CONSTRAINT IF EXISTS fk_tenancies_landlord,
DROP CONSTRAINT IF EXISTS fk_tenancies_landlord_profile;

-- Add the correct foreign key constraints
-- Property relationship
ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_property
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Tenant relationship - references profiles.user_id (not auth.users.id)
ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_tenant  
FOREIGN KEY (tenant_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Landlord relationship - references profiles.user_id (not auth.users.id)  
ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_landlord
FOREIGN KEY (landlord_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;