-- Per-party photo sets on condition records (amends ADR-0004).
-- Photos become permanent evidence the moment they are saved: no client deletes.
-- Each party's photo set locks when THAT party attests; one party's uploads no
-- longer clear the other party's attestation. Attestation audit: who attested.

ALTER TABLE public.condition_records
    ADD COLUMN tenant_attested_by UUID REFERENCES auth.users(id),
    ADD COLUMN landlord_attested_by UUID REFERENCES auth.users(id);

-- Backfill audit columns for records attested before this migration.
UPDATE public.condition_records r
SET tenant_attested_by = t.tenant_id
FROM public.tenancies t
WHERE t.id = r.tenancy_id AND r.tenant_attested_at IS NOT NULL;

UPDATE public.condition_records r
SET landlord_attested_by = t.landlord_id
FROM public.tenancies t
WHERE t.id = r.tenancy_id AND r.landlord_attested_at IS NOT NULL;

-- Retry-safe uploads: a second insert for the same object is a duplicate, not a new photo.
ALTER TABLE public.condition_photos
    ADD CONSTRAINT condition_photos_storage_path_key UNIQUE (storage_path);

-- Saved photos can never be deleted by parties.
DROP POLICY "Uploaders can delete their own photos while record is open" ON public.condition_photos;

-- Inserts are refused once the uploader's party has attested (their set is
-- locked) or the record is fully locked. Direct deletes are refused while the
-- parent record exists; cascades from record/tenancy deletion still pass.
-- Replaces the old clear-all-attestations behaviour.
CREATE OR REPLACE FUNCTION public.condition_photo_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_tenant UUID;
    v_landlord UUID;
    v_tenant_at TIMESTAMPTZ;
    v_landlord_at TIMESTAMPTZ;
    v_locked BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF EXISTS (SELECT 1 FROM condition_records WHERE id = OLD.record_id) THEN
            RAISE EXCEPTION 'Condition photos cannot be deleted once saved';
        END IF;
        RETURN OLD;
    END IF;

    SELECT t.tenant_id, t.landlord_id, r.tenant_attested_at, r.landlord_attested_at, r.locked
    INTO v_tenant, v_landlord, v_tenant_at, v_landlord_at, v_locked
    FROM condition_records r
    JOIN tenancies t ON t.id = r.tenancy_id
    WHERE r.id = NEW.record_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Condition record not found';
    END IF;
    IF v_locked THEN
        RAISE EXCEPTION 'Condition record % is locked', NEW.record_id;
    END IF;
    IF (NEW.uploaded_by = v_tenant AND v_tenant_at IS NOT NULL)
        OR (NEW.uploaded_by = v_landlord AND v_landlord_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Your photo set is locked by your attestation';
    END IF;
    RETURN NEW;
END;
$$;

-- Per-party idempotent (first attestation timestamp wins); records who attested.
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
        UPDATE condition_records
        SET tenant_attested_at = COALESCE(tenant_attested_at, now()),
            tenant_attested_by = COALESCE(tenant_attested_by, auth.uid())
        WHERE id = p_record_id;
    ELSIF auth.uid() = v_landlord THEN
        UPDATE condition_records
        SET landlord_attested_at = COALESCE(landlord_attested_at, now()),
            landlord_attested_by = COALESCE(landlord_attested_by, auth.uid())
        WHERE id = p_record_id;
    ELSE
        RAISE EXCEPTION 'Not a party to this condition record';
    END IF;
END;
$$;

-- Storage: parties may only remove orphaned objects (upload succeeded but the
-- condition_photos insert did not), so failed uploads can be cleaned up while
-- saved photos stay immutable.
DROP POLICY "Uploaders can delete their own condition photo files while open" ON storage.objects;

CREATE POLICY "Uploaders can clean up unsaved condition photo files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'condition-photos'
    AND owner = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.condition_photos p WHERE p.storage_path = name)
);

-- Tenancy parties need the property row for dynamic location tags (bedrooms,
-- bathrooms, amenities); the existing SELECT policy only covers 'available'
-- listings, which excludes tenants of rented properties.
CREATE POLICY "Tenancy parties can view their tenancy property"
ON public.properties FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tenancies t
        WHERE t.property_id = properties.id
          AND auth.uid() IN (t.tenant_id, t.landlord_id)
    )
);
