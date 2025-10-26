-- Add warning_count and is_banned columns to profiles table if they don't exist
DO $$
BEGIN
    -- Add warning_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'warning_count') THEN
        ALTER TABLE public.profiles ADD COLUMN warning_count INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add is_banned column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
        ALTER TABLE public.profiles ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add banned_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'banned_at') THEN
        ALTER TABLE public.profiles ADD COLUMN banned_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create or replace the increment_warning_count function
CREATE OR REPLACE FUNCTION public.increment_warning_count(user_id UUID)
RETURNS void AS $$
BEGIN
    -- Increment warning count
    UPDATE public.profiles
    SET 
        warning_count = COALESCE(warning_count, 0) + 1,
        updated_at = NOW()
    WHERE profiles.user_id = increment_warning_count.user_id;
    
    -- Auto-ban after 3 warnings (warning_count is 0-based, so we check for >= 2)
    UPDATE public.profiles
    SET 
        is_banned = true,
        banned_at = NOW()
    WHERE 
        profiles.user_id = increment_warning_count.user_id
        AND warning_count >= 2; -- 3rd warning will trigger ban (0, 1, 2 = 3 warnings)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_warning_count(UUID) TO authenticated;
