-- Update the messages table check constraint to allow viewing_proposal message type
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add the updated constraint with viewing_proposal included
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'system', 'viewing_proposal'));