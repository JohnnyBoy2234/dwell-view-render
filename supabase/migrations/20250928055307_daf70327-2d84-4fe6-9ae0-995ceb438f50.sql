-- Ensure conversation last_message_at is updated when messages are inserted
-- Check if trigger exists first, then create if needed

-- This trigger should update conversations.last_message_at when messages are inserted
-- The function already exists as update_conversation_last_message()

DO $$
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_conversation_last_message_trigger'
    ) THEN
        -- Create trigger
        CREATE TRIGGER update_conversation_last_message_trigger
            AFTER INSERT ON public.messages
            FOR EACH ROW
            EXECUTE FUNCTION public.update_conversation_last_message();
        
        RAISE NOTICE 'Created trigger: update_conversation_last_message_trigger';
    ELSE
        RAISE NOTICE 'Trigger already exists: update_conversation_last_message_trigger';
    END IF;
END
$$;