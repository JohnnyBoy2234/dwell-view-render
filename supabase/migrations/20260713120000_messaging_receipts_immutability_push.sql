-- Messaging overhaul: working read receipts, delivered state, hard message
-- immutability, push notification tokens, and realtime on properties.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) READ RECEIPTS FIX
-- The only UPDATE policy on messages was sender-only, so the *recipient*'s
-- "mark as read" update matched 0 rows silently — read receipts never worked.
-- Participants of a conversation may now update its messages; the trigger in
-- section 3 restricts them to receipt columns only.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can update message receipts" ON public.messages;
CREATE POLICY "Participants can update message receipts"
ON public.messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) DELIVERED STATE (three-state ticks: sent ✓ → delivered ✓✓ → read ✓✓ blue)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) HARD IMMUTABILITY
-- Messages are a permanent landlord–tenant record: no row may ever be deleted,
-- and no column other than the receipt columns may ever change. Applies to
-- every role including service_role and cascaded deletes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_message_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Messages are a permanent record and cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'read_by_landlord' - 'read_by_tenant' - 'delivered_at' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'read_by_landlord' - 'read_by_tenant' - 'delivered_at' - 'updated_at') THEN
    RAISE EXCEPTION 'Message content is immutable; only receipt status may change';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_immutable ON public.messages;
CREATE TRIGGER messages_immutable
BEFORE UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_immutability();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) PUSH NOTIFICATION TOKENS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own push tokens" ON public.push_tokens;
CREATE POLICY "Users manage their own push tokens"
ON public.push_tokens FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) REALTIME ON PROPERTIES
-- No surface ever received property changes live (the "new listing only shows
-- after refresh" bug) — the table was never in the realtime publication.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) PUSH ON NEW MESSAGE
-- Fire the send-message-push edge function from the database itself so pushes
-- go out even if the sender's app dies right after the insert. pg_net is
-- already enabled (billing cron uses it). The anon key is the public client
-- key — it only authenticates the function call, authorization happens inside.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_message_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/send-message-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig'
    ),
    body := jsonb_build_object('message_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_push_notify ON public.messages;
CREATE TRIGGER messages_push_notify
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_push();
