-- Add EXPERIAN_CREDIT_REPORT document type support
-- Update documents table to handle the new document type
ALTER TABLE documents ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES applications(id);

-- Create index for better performance on application document queries
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);