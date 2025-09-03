-- Add EXPERIAN_CREDIT_REPORT document type support
-- Update documents table to handle the new document type
ALTER TABLE documents ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES applications(id);

-- Create index for better performance on application document queries
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);

-- Insert the new document type if it doesn't exist
INSERT INTO public.documents (id, user_id, application_id, document_type, file_path, file_type, status)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', null, 'EXPERIAN_CREDIT_REPORT', '', 'application/pdf', 'pending')
ON CONFLICT DO NOTHING;