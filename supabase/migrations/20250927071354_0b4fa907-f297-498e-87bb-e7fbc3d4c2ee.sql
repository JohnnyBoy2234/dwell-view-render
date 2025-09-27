-- Add missing updated_at column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the trigger to handle updated_at properly
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;

-- Recreate the trigger function to ensure it works correctly
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notifications_updated_at_column();