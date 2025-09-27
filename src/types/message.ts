/**
 * Type definitions for message-related components
 */

export interface MessageProfile {
  display_name: string;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_by_landlord?: boolean;
  read_by_tenant?: boolean;
  optimistic?: boolean;
  profiles?: MessageProfile | null;
  message_type?: string | null;
  attachment_url?: string | null;
  viewing_proposal_id?: string | null;
}

export interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  isLandlord?: boolean;
  showTime?: boolean;
}

export type MessageRole = 'landlord' | 'tenant';