-- Create leases table
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    landlord_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN (
        'DRAFT', 
        'PENDING_TENANT_SIGNATURE', 
        'PENDING_LANDLORD_SIGNATURE', 
        'COMPLETED', 
        'CANCELED', 
        'CHANGES_REQUESTED'
    )),
    lease_data JSONB NOT NULL,
    pdf_draft_url TEXT,
    pdf_signed_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lease_signatures table
CREATE TABLE IF NOT EXISTS lease_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('TENANT', 'LANDLORD')),
    signer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_image_url TEXT,
    signature_hash TEXT,
    ip_address TEXT,
    user_agent TEXT,
    geo_meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lease_audit_logs table
CREATE TABLE IF NOT EXISTS lease_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN (
        'GENERATED', 
        'VIEWED', 
        'DOWNLOADED', 
        'SIGNED', 
        'REQUESTED_CHANGES', 
        'CANCELED', 
        'REGENERATED'
    )),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord_user_id ON leases(landlord_user_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_user_id ON leases(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_lease_signatures_lease_id ON lease_signatures(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_signatures_role ON lease_signatures(role);
CREATE INDEX IF NOT EXISTS idx_lease_audit_logs_lease_id ON lease_audit_logs(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_audit_logs_actor_user_id ON lease_audit_logs(actor_user_id);

-- Create updated_at trigger for leases table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leases_updated_at 
    BEFORE UPDATE ON leases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leases
CREATE POLICY "Users can view leases they are involved in" ON leases
    FOR SELECT USING (
        auth.uid() = landlord_user_id OR 
        auth.uid() = tenant_user_id
    );

CREATE POLICY "Landlords can create leases for their properties" ON leases
    FOR INSERT WITH CHECK (
        auth.uid() = landlord_user_id AND
        EXISTS (
            SELECT 1 FROM properties 
            WHERE id = property_id AND landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can update their leases" ON leases
    FOR UPDATE USING (
        auth.uid() = landlord_user_id
    );

CREATE POLICY "Landlords can delete their leases" ON leases
    FOR DELETE USING (
        auth.uid() = landlord_user_id
    );

-- Create RLS policies for lease_signatures
CREATE POLICY "Users can view signatures for leases they are involved in" ON lease_signatures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leases 
            WHERE id = lease_id AND (
                landlord_user_id = auth.uid() OR 
                tenant_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create signatures for their role in leases" ON lease_signatures
    FOR INSERT WITH CHECK (
        auth.uid() = signer_user_id AND
        EXISTS (
            SELECT 1 FROM leases 
            WHERE id = lease_id AND (
                (role = 'LANDLORD' AND landlord_user_id = auth.uid()) OR
                (role = 'TENANT' AND tenant_user_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can update their own signatures" ON lease_signatures
    FOR UPDATE USING (
        auth.uid() = signer_user_id
    );

-- Create RLS policies for lease_audit_logs
CREATE POLICY "Users can view audit logs for leases they are involved in" ON lease_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leases 
            WHERE id = lease_id AND (
                landlord_user_id = auth.uid() OR 
                tenant_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create audit logs for leases they are involved in" ON lease_audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() = actor_user_id AND
        EXISTS (
            SELECT 1 FROM leases 
            WHERE id = lease_id AND (
                landlord_user_id = auth.uid() OR 
                tenant_user_id = auth.uid()
            )
        )
    );
