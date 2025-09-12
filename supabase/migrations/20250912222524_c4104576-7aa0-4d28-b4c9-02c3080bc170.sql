-- Fix the last function security warning

-- Fix update_notifications_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;