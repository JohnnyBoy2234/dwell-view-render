-- Condition Record: photographic record of property condition at move-in/move-out,
-- captured by both tenancy parties, locked by mutual attestation. See ADR-0004.

CREATE TABLE public.condition_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('move_in', 'move_out')),
    -- Stored verbatim so old records keep the words actually agreed if wording changes.
    attestation_text TEXT NOT NULL DEFAULT 'Both parties confirm that the photographs in this record fairly represent the condition of the property as at the date of their agreement.',
    tenant_attested_at TIMESTAMPTZ,
    landlord_attested_at TIMESTAMPTZ,
    tenant_notes TEXT,
    landlord_notes TEXT,
    locked BOOLEAN GENERATED ALWAYS AS (tenant_attested_at IS NOT NULL AND landlord_attested_at IS NOT NULL) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenancy_id, event_type)
);

CREATE TABLE public.condition_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_tag TEXT NOT NULL,
    caption TEXT,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_condition_records_tenancy_id ON public.condition_records(tenancy_id);
CREATE INDEX idx_condition_photos_record_id ON public.condition_photos(record_id);

CREATE TRIGGER update_condition_records_updated_at
    BEFORE UPDATE ON public.condition_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Both tenancy parties see the record; used by table and storage policies.
CREATE OR REPLACE FUNCTION public.is_condition_record_party(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM condition_records r
        JOIN tenancies t ON t.id = r.tenancy_id
        WHERE r.id = p_record_id
          AND auth.uid() IN (t.tenant_id, t.landlord_id)
    );
$$;

ALTER TABLE public.condition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their condition records"
ON public.condition_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tenancies t
        WHERE t.id = tenancy_id AND auth.uid() IN (t.tenant_id, t.landlord_id)
    )
);

CREATE POLICY "Parties can create condition records for their tenancy"
ON public.condition_records FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tenancies t
        WHERE t.id = tenancy_id AND auth.uid() IN (t.tenant_id, t.landlord_id)
    )
);
-- No UPDATE/DELETE policies on condition_records: attestation and notes go through
-- the RPCs below; records are never deleted by clients.

CREATE POLICY "Parties can view condition photos"
ON public.condition_photos FOR SELECT
USING (public.is_condition_record_party(record_id));

CREATE POLICY "Parties can add photos to open condition records"
ON public.condition_photos FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_condition_record_party(record_id)
    AND NOT EXISTS (SELECT 1 FROM public.condition_records r WHERE r.id = record_id AND r.locked)
);

CREATE POLICY "Uploaders can delete their own photos while record is open"
ON public.condition_photos FOR DELETE
USING (
    uploaded_by = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.condition_records r WHERE r.id = record_id AND r.locked)
);
-- No UPDATE policy on condition_photos: fix a wrong tag by delete + re-upload.

-- ADR-0004: any photo change on an open record clears all attestations (both parties
-- must re-agree); changes to a locked record are refused outright.
CREATE OR REPLACE FUNCTION public.condition_photo_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    rid UUID := COALESCE(NEW.record_id, OLD.record_id);
BEGIN
    IF EXISTS (SELECT 1 FROM condition_records WHERE id = rid AND locked) THEN
        RAISE EXCEPTION 'Condition record % is locked', rid;
    END IF;
    UPDATE condition_records
    SET tenant_attested_at = NULL, landlord_attested_at = NULL
    WHERE id = rid;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER condition_photo_change
    BEFORE INSERT OR DELETE ON public.condition_photos
    FOR EACH ROW EXECUTE FUNCTION public.condition_photo_change();

-- Sets the calling party's attestation timestamp. Idempotent; no-op once locked.
CREATE OR REPLACE FUNCTION public.attest_condition_record(p_record_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_tenant UUID;
    v_landlord UUID;
    v_locked BOOLEAN;
BEGIN
    SELECT t.tenant_id, t.landlord_id, r.locked
    INTO v_tenant, v_landlord, v_locked
    FROM condition_records r
    JOIN tenancies t ON t.id = r.tenancy_id
    WHERE r.id = p_record_id
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Condition record not found';
    END IF;
    IF v_locked THEN
        RETURN;
    END IF;
    IF auth.uid() = v_tenant THEN
        UPDATE condition_records SET tenant_attested_at = now() WHERE id = p_record_id;
    ELSIF auth.uid() = v_landlord THEN
        UPDATE condition_records SET landlord_attested_at = now() WHERE id = p_record_id;
    ELSE
        RAISE EXCEPTION 'Not a party to this condition record';
    END IF;
END;
$$;

-- Sets the calling party's free-text notes. Refused once locked.
CREATE OR REPLACE FUNCTION public.set_condition_notes(p_record_id UUID, p_notes TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_tenant UUID;
    v_landlord UUID;
    v_locked BOOLEAN;
BEGIN
    SELECT t.tenant_id, t.landlord_id, r.locked
    INTO v_tenant, v_landlord, v_locked
    FROM condition_records r
    JOIN tenancies t ON t.id = r.tenancy_id
    WHERE r.id = p_record_id
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Condition record not found';
    END IF;
    IF v_locked THEN
        RAISE EXCEPTION 'Condition record is locked';
    END IF;
    IF auth.uid() = v_tenant THEN
        UPDATE condition_records SET tenant_notes = p_notes WHERE id = p_record_id;
    ELSIF auth.uid() = v_landlord THEN
        UPDATE condition_records SET landlord_notes = p_notes WHERE id = p_record_id;
    ELSE
        RAISE EXCEPTION 'Not a party to this condition record';
    END IF;
END;
$$;

-- Live updates so both parties watch the shared gallery fill in real time.
ALTER PUBLICATION supabase_realtime ADD TABLE public.condition_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.condition_photos;

-- Private bucket; object paths are {record_id}/{filename}.
INSERT INTO storage.buckets (id, name, public)
VALUES ('condition-photos', 'condition-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Parties can view condition photo files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'condition-photos'
    AND public.is_condition_record_party(((string_to_array(name, '/'))[1])::uuid)
);

CREATE POLICY "Parties can upload condition photo files to open records"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'condition-photos'
    AND public.is_condition_record_party(((string_to_array(name, '/'))[1])::uuid)
    AND NOT EXISTS (
        SELECT 1 FROM public.condition_records r
        WHERE r.id = ((string_to_array(name, '/'))[1])::uuid AND r.locked
    )
);

CREATE POLICY "Uploaders can delete their own condition photo files while open"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'condition-photos'
    AND owner = auth.uid()
    AND NOT EXISTS (
        SELECT 1 FROM public.condition_records r
        WHERE r.id = ((string_to_array(name, '/'))[1])::uuid AND r.locked
    )
);
