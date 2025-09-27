-- Update the messages_message_type_check constraint to include 'attachment'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'system', 'viewing_proposal', 'attachment'));