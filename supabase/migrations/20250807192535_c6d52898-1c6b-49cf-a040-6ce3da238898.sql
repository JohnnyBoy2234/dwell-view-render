-- Rename lease_document_url to lease_document_path for better security
ALTER TABLE public.tenancies
RENAME COLUMN lease_document_url TO lease_document_path;