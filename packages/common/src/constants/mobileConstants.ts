/**
 * Constants for mobile-related functionality
 */

// Authentication labels and messages
export const MOBILE_AUTH_LABELS = {
  TITLE: 'Quick Access',
  AUTHENTICATING: 'Authenticating...',
  FALLBACK_BUTTON: 'Use Password Instead',
  SUCCESS_MESSAGE: 'Authentication successful',
  ERROR_MESSAGE: 'Authentication failed',
  GENERAL_ERROR: 'Authentication error',
  NOT_AVAILABLE: 'Biometric authentication not available',
} as const;

// Platform-specific authentication text
export const PLATFORM_AUTH_TEXT = {
  IOS: 'Use Face ID or Touch ID',
  ANDROID: 'Use Fingerprint',
  DEFAULT: 'Use Biometric Authentication',
} as const;

// ARIA labels
export const MOBILE_ARIA_LABELS = {
  AUTH_BUTTON: 'Authenticate with biometrics',
  FALLBACK_BUTTON: 'Use password authentication instead',
} as const;