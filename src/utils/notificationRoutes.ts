/**
 * Centralized notification routing utility
 * Maps notification types to correct, existing routes in the app
 */

export interface NotificationMetadata {
  leaseId?: string;
  requestId?: string;
  applicationId?: string;
  viewingId?: string;
  offerId?: string;
  inventoryId?: string;
  propertyId?: string;
  conversationId?: string;
  redirect_url?: string;
  [key: string]: any;
}

export interface NotificationForRouting {
  type?: string;
  action_url?: string;
  link_url?: string;
  actionUrl?: string;
  linkUrl?: string;
  metadata?: NotificationMetadata;
}

/**
 * Get the correct target URL for a notification based on its type and metadata
 * Uses actual routes that exist in App.tsx
 */
export const getNotificationTargetUrl = (
  notification: NotificationForRouting,
  isLandlord: boolean
): string => {
  const metadata = notification.metadata || {};
  
  // Priority 1: Check for valid stored URLs (but validate they're not broken dashboard routes)
  const storedUrl = notification.action_url || notification.link_url || notification.actionUrl || notification.linkUrl;
  if (storedUrl && isValidRoute(storedUrl)) {
    return storedUrl;
  }
  
  // Priority 2: Build URL based on type and metadata using actual routes
  const { leaseId, requestId, applicationId, viewingId, offerId, inventoryId, propertyId, conversationId, redirect_url } = metadata;
  
  // Dashboard base for fallbacks
  const landlordBase = '/enhancedlandlorddashboard';
  const tenantBase = '/enhancedtenantdashboard';
  
  switch (notification.type) {
    case 'lease':
      // Use the actual /lease/sign/:contractId route
      if (leaseId) {
        return `/lease/sign/${leaseId}`;
      }
      return '/leases';
      
    case 'maintenance':
      // Use the actual /maintenance/:ticketId route
      if (requestId) {
        return `/maintenance/${requestId}`;
      }
      return isLandlord ? `${landlordBase}/maintenance` : `${tenantBase}/maintenance`;
      
    case 'application':
      // Use the actual /application/:id route
      if (applicationId) {
        return `/application/${applicationId}`;
      }
      return '/applications';
      
    case 'payment':
      return isLandlord ? `${landlordBase}/payments` : `${tenantBase}/payments`;
      
    case 'viewing':
      // Navigate to the applications/viewings tab with viewing ID in query params
      if (viewingId) {
        return isLandlord 
          ? `${landlordBase}/applications?tab=viewings&viewingId=${viewingId}`
          : `${tenantBase}/viewings?id=${viewingId}`;
      }
      return isLandlord ? `${landlordBase}/applications?tab=viewings` : `${tenantBase}/viewings`;
      
    case 'inventory':
      // Navigate to inventory tab with ID in query params
      if (inventoryId) {
        return isLandlord 
          ? `${landlordBase}/inventory?id=${inventoryId}`
          : `${tenantBase}/inventory?id=${inventoryId}`;
      }
      return isLandlord ? `${landlordBase}/inventory` : `${tenantBase}/inventory`;
      
    case 'offer':
      // Offers are tied to applications - use application route
      if (offerId) {
        return `/application/${offerId}`;
      }
      if (applicationId) {
        return `/application/${applicationId}`;
      }
      return '/applications';
      
    case 'message':
      return conversationId ? `/messages?c=${conversationId}` : '/messages';
      
    case 'system':
      if (redirect_url) {
        return redirect_url;
      }
      // Fall through to default
      break;
      
    default:
      if (conversationId) {
        return `/messages?c=${conversationId}`;
      }
      if (propertyId) {
        return `/property/${propertyId}`;
      }
  }
  
  // Final fallback
  return isLandlord ? landlordBase : tenantBase;
};

/**
 * Check if a stored URL is valid and not one of the broken patterns
 */
function isValidRoute(url: string): boolean {
  // Skip empty URLs
  if (!url || !url.startsWith('/')) {
    return false;
  }
  
  // These patterns are known to cause 404s - they need to be rebuilt
  const brokenPatterns = [
    /^\/enhanced(landlord|tenant)dashboard\/leases\/.+/,      // /enhancedlandlorddashboard/leases/123
    /^\/enhanced(landlord|tenant)dashboard\/applications\/.+/, // /enhancedlandlorddashboard/applications/123
    /^\/enhanced(landlord|tenant)dashboard\/viewings\/.+/,    // /enhancedlandlorddashboard/viewings/123
    /^\/enhanced(landlord|tenant)dashboard\/offers\/.+/,      // /enhancedlandlorddashboard/offers/123
    /^\/enhanced(landlord|tenant)dashboard\/inventory\/.+/,   // /enhancedlandlorddashboard/inventory/123
    /^\/enhanced(landlord|tenant)dashboard\/maintenance\/.+/, // /enhancedlandlorddashboard/maintenance/123
    /^\/tenant\/viewings$/,                                    // /tenant/viewings (wrong path)
  ];
  
  for (const pattern of brokenPatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate correct URLs for notifications when creating them
 * Use these instead of hardcoded dashboard paths
 */
export const NotificationUrls = {
  lease: (leaseId: string) => `/lease/sign/${leaseId}`,
  leaseList: () => '/leases',
  
  application: (applicationId: string) => `/application/${applicationId}`,
  applicationList: () => '/applications',
  
  maintenance: (ticketId: string) => `/maintenance/${ticketId}`,
  maintenanceDashboard: (isLandlord: boolean) => 
    isLandlord ? '/enhancedlandlorddashboard/maintenance' : '/enhancedtenantdashboard/maintenance',
  
  viewing: (viewingId: string, isLandlord: boolean) => 
    isLandlord 
      ? `/enhancedlandlorddashboard/applications?tab=viewings&viewingId=${viewingId}`
      : `/enhancedtenantdashboard/viewings?id=${viewingId}`,
  viewingList: (isLandlord: boolean) => 
    isLandlord ? '/enhancedlandlorddashboard/applications?tab=viewings' : '/enhancedtenantdashboard/viewings',
  
  inventory: (inventoryId: string, isLandlord: boolean) => 
    isLandlord 
      ? `/enhancedlandlorddashboard/inventory?id=${inventoryId}`
      : `/enhancedtenantdashboard/inventory?id=${inventoryId}`,
  
  payment: (isLandlord: boolean) => 
    isLandlord ? '/enhancedlandlorddashboard/payments' : '/enhancedtenantdashboard/payments',
  
  messages: (conversationId?: string) => 
    conversationId ? `/messages?c=${conversationId}` : '/messages',
  
  property: (propertyId: string) => `/property/${propertyId}`,
  
  verifyId: () => '/verify-id',
  
  dashboard: (isLandlord: boolean) => 
    isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard',
};
