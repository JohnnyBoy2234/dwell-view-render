-- Additive migration: provider + envelope/certificate fields on tenancies
ALTER TABLE public.tenancies
  ADD COLUMN IF NOT EXISTS signing_provider text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS envelope_id text,
  ADD COLUMN IF NOT EXISTS certificate_url text;

-- Backfill existing rows to legacy
UPDATE public.tenancies SET signing_provider = 'legacy' WHERE signing_provider IS NULL;

-- Optional: index for lookups by provider/envelope
CREATE INDEX IF NOT EXISTS idx_tenancies_signing_provider ON public.tenancies (signing_provider);
CREATE INDEX IF NOT EXISTS idx_tenancies_envelope_id ON public.tenancies (envelope_id);
