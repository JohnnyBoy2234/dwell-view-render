/**
 * Constants for message-related functionality
 */

// URL patterns
export const URL_PATTERNS = {
  GENERAL: /https?:\/\/[^\s]+/g,
  INVITE: '/apply/invite/',
} as const;

// CSS classes
export const MESSAGE_STYLES = {
  BUBBLE_BASE: 'max-w-[90%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] xl:max-w-[50%] rounded-2xl px-3 py-2 shadow-sm transition-all duration-200 break-words whitespace-pre-wrap',
  OWN_MESSAGE: 'bg-ios-blue text-white rounded-br-sm',
  OTHER_MESSAGE: 'bg-card border border-border rounded-bl-sm',
  CONTENT_TEXT: 'text-sm leading-relaxed whitespace-pre-wrap break-words',
  TIMESTAMP_BASE: 'flex items-center justify-end gap-1 mt-1 text-xs',
  TIMESTAMP_OWN: 'text-white/70',
  TIMESTAMP_OTHER: 'text-muted-foreground',
} as const;

// Time formats
export const TIME_FORMATS = {
  TODAY: 'HH:mm',
  OTHER_DAYS: 'MMM dd, HH:mm',
} as const;

// Button labels
export const BUTTON_LABELS = {
  START_APPLICATION: 'Request Application',
} as const;

// ARIA labels
export const ARIA_LABELS = {
  MESSAGE_STATUS: 'Message status',
  EXTERNAL_LINK: 'External link (opens in new tab)',
  APPLICATION_INVITE: 'Start rental application',
} as const;