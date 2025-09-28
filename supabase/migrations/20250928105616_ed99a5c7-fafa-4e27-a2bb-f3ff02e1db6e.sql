-- Create storage bucket for proof of payment documents
INSERT INTO storage.buckets (id, name, public) VALUES ('proof-of-payment', 'proof-of-payment', false);

-- Create proof_of_payment table
CREATE TABLE public.proof_of_payment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('bank_statement', 'transfer_receipt', 'other')),
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'verified')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proof_of_payment ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own proof of payment documents" 
ON public.proof_of_payment 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own proof of payment documents" 
ON public.proof_of_payment 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proof of payment documents" 
ON public.proof_of_payment 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proof of payment documents" 
ON public.proof_of_payment 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage policies for proof-of-payment bucket
CREATE POLICY "Users can view their own proof of payment files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'proof-of-payment' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own proof of payment files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'proof-of-payment' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own proof of payment files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'proof-of-payment' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own proof of payment files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'proof-of-payment' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for updated_at
CREATE TRIGGER update_proof_of_payment_updated_at
BEFORE UPDATE ON public.proof_of_payment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();