-- Create inventory_records table
CREATE TABLE IF NOT EXISTS public.inventory_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    country TEXT NOT NULL DEFAULT 'South Africa',
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'approved', 'rejected')),
    rooms_recorded INTEGER DEFAULT 0,
    photos_count INTEGER DEFAULT 0,
    voice_notes_count INTEGER DEFAULT 0,
    landlord_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure only one inventory record per country per property
    UNIQUE(property_id, country)
);

-- Create inventory_items table for detailed room/item records
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_record_id UUID NOT NULL REFERENCES public.inventory_records(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    description TEXT,
    photos TEXT[] DEFAULT '{}',
    voice_note_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_reports table for generated reports
CREATE TABLE IF NOT EXISTS public.inventory_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_record_id UUID NOT NULL REFERENCES public.inventory_records(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('move_in', 'move_out', 'periodic')),
    pdf_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_records
CREATE POLICY "Tenants can view their own inventory records"
ON public.inventory_records FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can view inventory records for their properties"
ON public.inventory_records FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can create inventory records for their properties"
ON public.inventory_records FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update their own inventory records"
ON public.inventory_records FOR UPDATE
USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can update inventory records for their properties"
ON public.inventory_records FOR UPDATE
USING (auth.uid() = landlord_id);

-- Create RLS policies for inventory_items
CREATE POLICY "Users can view inventory items for records they have access to"
ON public.inventory_items FOR SELECT
USING (
    inventory_record_id IN (
        SELECT id FROM public.inventory_records 
        WHERE tenant_id = auth.uid() OR landlord_id = auth.uid()
    )
);

CREATE POLICY "Tenants can manage inventory items for their records"
ON public.inventory_items FOR ALL
USING (
    inventory_record_id IN (
        SELECT id FROM public.inventory_records 
        WHERE tenant_id = auth.uid()
    )
);

-- Create RLS policies for inventory_reports
CREATE POLICY "Users can view inventory reports for records they have access to"
ON public.inventory_reports FOR SELECT
USING (
    inventory_record_id IN (
        SELECT id FROM public.inventory_records 
        WHERE tenant_id = auth.uid() OR landlord_id = auth.uid()
    )
);

CREATE POLICY "System can create inventory reports"
ON public.inventory_reports FOR INSERT
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_records_property_id ON public.inventory_records(property_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_tenant_id ON public.inventory_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_landlord_id ON public.inventory_records(landlord_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_country ON public.inventory_records(country);
CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory_record_id ON public.inventory_items(inventory_record_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reports_inventory_record_id ON public.inventory_reports(inventory_record_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_records_updated_at 
    BEFORE UPDATE ON public.inventory_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at 
    BEFORE UPDATE ON public.inventory_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
