-- Create landlord_settings table
CREATE TABLE IF NOT EXISTS public.landlord_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact TEXT NOT NULL,
    vat_number TEXT,
    bank TEXT,
    account_holder TEXT,
    account_number TEXT,
    branch_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    landlord_details JSONB NOT NULL,
    tenant_details JSONB NOT NULL,
    property_details JSONB NOT NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, invoice_number)
);

-- Create additional_costs table
CREATE TABLE IF NOT EXISTS public.additional_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tenant_id UUID,
    property_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoice_schedule_settings table
CREATE TABLE IF NOT EXISTS public.invoice_schedule_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_days INTEGER NOT NULL DEFAULT 7 CHECK (schedule_days IN (1, 3, 7)),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.landlord_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_schedule_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for landlord_settings
CREATE POLICY "Users can view their own landlord settings" ON public.landlord_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own landlord settings" ON public.landlord_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own landlord settings" ON public.landlord_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own landlord settings" ON public.landlord_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON public.invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON public.invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for additional_costs
CREATE POLICY "Users can view their own additional costs" ON public.additional_costs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own additional costs" ON public.additional_costs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own additional costs" ON public.additional_costs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own additional costs" ON public.additional_costs
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for invoice_schedule_settings
CREATE POLICY "Users can view their own invoice schedule settings" ON public.invoice_schedule_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoice schedule settings" ON public.invoice_schedule_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice schedule settings" ON public.invoice_schedule_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice schedule settings" ON public.invoice_schedule_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_landlord_settings_user_id ON public.landlord_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date);
CREATE INDEX IF NOT EXISTS idx_additional_costs_user_id ON public.additional_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_additional_costs_active ON public.additional_costs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_invoice_schedule_settings_user_id ON public.invoice_schedule_settings(user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.landlord_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.additional_costs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.invoice_schedule_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
