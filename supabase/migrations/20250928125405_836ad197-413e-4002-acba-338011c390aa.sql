-- Fix the UPDATE policy for messages to allow users to update read status
-- on messages they receive (not just messages they send)

-- Drop the current restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create a new policy that allows users to update their own messages (content)
-- AND allows users to update read status on messages in their conversations
CREATE POLICY "Users can update messages in their conversations" 
ON public.messages 
FOR UPDATE 
USING (
  -- Allow updating own messages (for editing content)
  (auth.uid() = sender_id) 
  OR 
  -- Allow updating read status on any message in conversations they're part of
  (conversation_id IN (
    SELECT id FROM conversations 
    WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
  ))
) 
WITH CHECK (
  -- When updating, ensure user is either the sender or part of the conversation
  (auth.uid() = sender_id) 
  OR 
  (conversation_id IN (
    SELECT id FROM conversations 
    WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
  ))
);