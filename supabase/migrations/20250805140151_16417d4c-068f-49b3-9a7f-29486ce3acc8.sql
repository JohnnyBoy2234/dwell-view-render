-- Add id_verification_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN id_verification_status text DEFAULT 'unverified' CHECK (id_verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Update existing records to have 'verified' status if id_verified is true
UPDATE public.profiles 
SET id_verification_status = 'verified' 
WHERE id_verified = true;