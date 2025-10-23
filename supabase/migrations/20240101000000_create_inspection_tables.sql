-- Create inspection_records table
CREATE TABLE IF NOT EXISTS public.inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.inspection_records ENABLE ROW LEVEL SECURITY;

-- Create inspection_items table
CREATE TABLE IF NOT EXISTS public.inspection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES public.inspection_records(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_attention')),
    description TEXT,
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inspection_records_property_id ON public.inspection_records(property_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_status ON public.inspection_records(status);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);

-- Set up RLS policies for inspection_records
CREATE POLICY "Enable read access for authenticated users"
ON public.inspection_records
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.inspection_records
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for owners"
ON public.inspection_records
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Set up RLS policies for inspection_items
CREATE POLICY "Enable read access for authenticated users"
ON public.inspection_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.inspection_records
        WHERE inspection_records.id = inspection_items.inspection_id
        AND (inspection_records.created_by = auth.uid() OR 
             EXISTS (
                 SELECT 1 FROM public.properties
                 WHERE properties.id = inspection_records.property_id
                 AND properties.landlord_id = auth.uid()
             ))
    )
);

CREATE POLICY "Enable insert for inspection owners"
ON public.inspection_items
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.inspection_records
        WHERE inspection_records.id = inspection_items.inspection_id
        AND inspection_records.created_by = auth.uid()
    )
);

CREATE POLICY "Enable update for inspection owners"
ON public.inspection_items
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.inspection_records
        WHERE inspection_records.id = inspection_items.inspection_id
        AND inspection_records.created_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.inspection_records
        WHERE inspection_records.id = inspection_items.inspection_id
        AND inspection_records.created_by = auth.uid()
    )
);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at
CREATE TRIGGER update_inspection_records_updated_at
BEFORE UPDATE ON public.inspection_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_items_updated_at
BEFORE UPDATE ON public.inspection_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments to tables and columns
COMMENT ON TABLE public.inspection_records IS 'Stores inspection records for properties';
COMMENT ON COLUMN public.inspection_records.status IS 'Current status of the inspection: scheduled, in_progress, completed, or cancelled';
COMMENT ON COLUMN public.inspection_records.scheduled_date IS 'When the inspection is scheduled to take place';
COMMENT ON COLUMN public.inspection_records.completed_date IS 'When the inspection was marked as completed';

COMMENT ON TABLE public.inspection_items IS 'Stores individual items being inspected as part of an inspection record';
COMMENT ON COLUMN public.inspection_items.condition IS 'Condition of the item: excellent, good, fair, poor, or needs_attention';
COMMENT ON COLUMN public.inspection_items.photos IS 'Array of photo URLs for this inspection item';
