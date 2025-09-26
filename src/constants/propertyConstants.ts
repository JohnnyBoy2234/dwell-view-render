/**
 * Constants for property-related functionality
 */

// Property status labels
export const PROPERTY_STATUS = {
  RENTED: 'rented',
  VACANT: 'vacant',
  AVAILABLE: 'available',
} as const;

// Property overview labels
export const PROPERTY_LABELS = {
  MONTHLY_RENT: 'Monthly Rent',
  OCCUPANCY: 'Occupancy',
  APPLICATIONS: 'Applications',
  MAINTENANCE: 'Maintenance',
  QUICK_ACTIONS: 'Quick Actions',
  RECENT_ACTIVITY: 'Recent Activity',
  PROPERTY_DETAILS: 'Property Details',
  PROPERTY_TYPE: 'Property Type',
  STATUS: 'Status',
  LOCATION: 'Location',
  LISTED: 'Listed',
} as const;

// Quick action labels
export const QUICK_ACTION_LABELS = {
  VIEW_MESSAGES: 'View Messages',
  PROPERTY_LISTING: 'Property Listing',
  SCHEDULE_VIEWING: 'Schedule Viewing',
} as const;

// Activity types and labels
export const ACTIVITY_TYPES = {
  APPLICATION: 'application',
  MAINTENANCE: 'maintenance',
  VIEWING: 'viewing',
} as const;

// Occupancy status text
export const OCCUPANCY_STATUS = {
  FULL: '100%',
  EMPTY: '0%',
  OCCUPIED: 'Occupied',
  VACANT: 'Vacant',
} as const;

// Application status text
export const APPLICATION_STATUS_TEXT = {
  PENDING: 'pending',
  ACTIVE: 'active',
} as const;

// Color scheme for different elements
export const PROPERTY_COLORS = {
  IOS_GREEN: 'ios-green',
  IOS_BLUE: 'ios-blue',
  IOS_PURPLE: 'ios-purple',
  IOS_ORANGE: 'ios-orange',
  SUCCESS_GREEN: 'success-green',
} as const;

// Routes
export const PROPERTY_ROUTES = {
  MESSAGES: '/messages',
  PROPERTY_DETAIL: (id: string) => `/property/${id}`,
  MANAGE_PROPERTY: (id: string) => `/manage-property/${id}`,
  MANAGE_VIEWINGS: (id: string) => `/manage-property/${id}?tab=viewings`,
} as const;