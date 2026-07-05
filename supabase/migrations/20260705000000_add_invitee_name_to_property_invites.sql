-- Store the tenant's name that the landlord enters on the invite form, so the
-- tenant's profile can show a real name (instead of an email-derived code) once
-- they join.
ALTER TABLE public.property_invites
  ADD COLUMN IF NOT EXISTS invitee_name text;
