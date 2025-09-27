-- Create optimized RPC function for fetching conversations with all details
CREATE OR REPLACE FUNCTION public.get_conversations_with_details(
  user_id UUID,
  is_landlord_param BOOLEAN
) 
RETURNS TABLE (
  id UUID,
  property_id UUID,
  landlord_id UUID,
  tenant_id UUID,
  status TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  properties JSONB,
  landlord_profile JSONB,
  tenant_profile JSONB,
  unread_count BIGINT,
  last_message TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_data AS (
    SELECT 
      c.id,
      c.property_id,
      c.landlord_id,
      c.tenant_id,
      c.status,
      c.last_message_at,
      c.created_at,
      row_to_json(p.*) as properties,
      row_to_json(lp.*) as landlord_profile,
      row_to_json(tp.*) as tenant_profile
    FROM conversations c
    LEFT JOIN properties p ON c.property_id = p.id
    LEFT JOIN profiles lp ON c.landlord_id = lp.user_id
    LEFT JOIN profiles tp ON c.tenant_id = tp.user_id
    WHERE c.landlord_id = get_conversations_with_details.user_id 
       OR c.tenant_id = get_conversations_with_details.user_id
  ),
  unread_counts AS (
    SELECT 
      cd.id as conversation_id,
      COALESCE(COUNT(m.id), 0) as unread_count
    FROM conversation_data cd
    LEFT JOIN messages m ON m.conversation_id = cd.id
      AND m.sender_id != get_conversations_with_details.user_id
      AND (
        (is_landlord_param = true AND m.read_by_landlord = false) OR
        (is_landlord_param = false AND m.read_by_tenant = false)
      )
    GROUP BY cd.id
  ),
  latest_messages AS (
    SELECT DISTINCT ON (cd.id)
      cd.id as conversation_id,
      m.content as last_message
    FROM conversation_data cd
    LEFT JOIN messages m ON m.conversation_id = cd.id
    ORDER BY cd.id, m.created_at DESC
  )
  SELECT 
    cd.id,
    cd.property_id,
    cd.landlord_id,
    cd.tenant_id,
    cd.status,
    cd.last_message_at,
    cd.created_at,
    cd.properties,
    cd.landlord_profile,
    cd.tenant_profile,
    uc.unread_count,
    lm.last_message
  FROM conversation_data cd
  LEFT JOIN unread_counts uc ON cd.id = uc.conversation_id
  LEFT JOIN latest_messages lm ON cd.id = lm.conversation_id
  ORDER BY cd.last_message_at DESC NULLS LAST;
END;
$$;