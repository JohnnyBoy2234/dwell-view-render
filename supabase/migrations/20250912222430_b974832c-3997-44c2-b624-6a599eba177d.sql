-- Fix security warnings by setting search_path for functions

-- Fix the update_updated_at_column_generic function
CREATE OR REPLACE FUNCTION public.update_updated_at_column_generic()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;