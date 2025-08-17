-- Add foreign key relationships for better data integrity and caching
ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_property 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_tenant 
FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.tenancies 
ADD CONSTRAINT fk_tenancies_landlord 
FOREIGN KEY (landlord_id) REFERENCES auth.users(id) ON DELETE CASCADE;