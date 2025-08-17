-- Add 'completed' status to viewing_slots if not exists
DO $$
BEGIN
    -- Check if we need to update the status check constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'viewing_slots_status_check' 
        AND conrelid = 'viewing_slots'::regclass
    ) THEN
        -- Add check constraint allowing 'completed' status
        ALTER TABLE viewing_slots 
        ADD CONSTRAINT viewing_slots_status_check 
        CHECK (status IN ('available', 'booked', 'completed'));
    END IF;
END $$;

-- Add new status options to applications table if not exists
DO $$
BEGIN
    -- Check if we need to update the applications status check constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'applications_status_check' 
        AND conrelid = 'applications'::regclass
    ) THEN
        -- Add check constraint with new status options
        ALTER TABLE applications 
        ADD CONSTRAINT applications_status_check 
        CHECK (status IN ('invited', 'submitted', 'pending_credit_check', 'pending', 'accepted', 'declined'));
    END IF;
END $$;