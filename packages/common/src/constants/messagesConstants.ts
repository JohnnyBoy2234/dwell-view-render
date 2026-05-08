/**
 * Constants for messaging functionality
 */

// Message-related routes
export const MESSAGE_ROUTES = {
  LANDLORD_MESSAGES: '/messages',
  TENANT_MESSAGES: '/tenant-messages'
} as const;

// Database field mappings
export const MESSAGE_FIELDS = {
  SENDER_ID: 'sender_id',
  RECEIVER_ID: 'receiver_id',
  PROPERTY_ID: 'property_id',
  CONTENT: 'content',
  CREATED_AT: 'created_at',
  IS_READ: 'is_read'
} as const;

// Query selections
export const MESSAGE_QUERY_FIELDS = `
  *,
  sender_profile:profiles!messages_sender_id_fkey (
    display_name
  ),
  receiver_profile:profiles!messages_receiver_id_fkey (
    display_name
  ),
  properties (
    title
  )
` as const;

// UI constants
export const UI_CONSTANTS = {
  MAX_CONVERSATIONS_SHOWN: 5,
  CONVERSATION_KEY_SEPARATOR: '-',
  DEFAULT_USER_NAME: 'Unknown User',
  GENERAL_CONVERSATION_KEY: 'general'
} as const;

// Loading state configuration
export const LOADING_SKELETON_COUNT = 3;

// Icon and styling constants
export const MESSAGE_ICONS = {
  MESSAGE_SQUARE: 'MessageSquare',
  USER: 'User', 
  CLOCK: 'Clock',
  SEND: 'Send'
} as const;

// ARIA labels
export const ARIA_LABELS = {
  MESSAGES_SECTION: 'Messages section',
  CONVERSATION_ITEM: 'Conversation with user',
  UNREAD_COUNT: 'Unread message count',
  VIEW_ALL_MESSAGES: 'View all messages',
  MESSAGE_TIME: 'Message timestamp'
} as const;

// Empty state messages
export const EMPTY_STATE_MESSAGES = {
  LANDLORD: "Messages from tenants and applicants will appear here",
  TENANT: "Messages from landlords will appear here"
} as const;