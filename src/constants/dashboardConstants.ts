/**
 * Constants for dashboard-related functionality
 */

// Layout dimensions and styling
export const DASHBOARD_LAYOUT = {
  HEADER_HEIGHT: 'h-16',
  SIDEBAR_BREAKPOINT: 'lg:hidden',
  BACKGROUND_GRADIENT: 'bg-gradient-to-br from-background via-background to-muted/20',
} as const;

// Header configuration
export const DASHBOARD_HEADER = {
  BACKDROP_BLUR: 'bg-background/95 backdrop-blur-md',
  STICKY_POSITIONING: 'sticky top-0 z-40',
  PADDING: 'px-4 lg:px-6',
} as const;

// Button labels and text
export const DASHBOARD_LABELS = {
  SIGN_OUT: 'Sign Out',
  SIGN_OUT_MOBILE: 'Sign out',
} as const;

// ARIA labels
export const DASHBOARD_ARIA_LABELS = {
  HEADER: 'Dashboard header',
  SIGN_OUT_BUTTON: 'Sign out of your account',
  NOTIFICATIONS: 'View notifications',
  MAIN_CONTENT: 'Main dashboard content',
} as const;