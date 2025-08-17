-- Add ID verification field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN id_verified BOOLEAN NOT NULL DEFAULT false;