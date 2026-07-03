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
 * Get the correct target URL for a notification based on its type and metadata.
 * Landlord notifications use propertyId to pre-select the right property in the dashboard.
 */
export const getNotificationTargetUrl = (
  notification: NotificationForRouting,
  isLandlord: boolean
): string => {
  const metadata = notification.metadata || {};

  // Priority 1: Valid stored URLs (skip broken dashboard sub-paths)
  const storedUrl =
    notification.action_url ||
    notification.link_url ||
    notification.actionUrl ||
    notification.linkUrl;
  if (storedUrl && isValidRoute(storedUrl, isLandlord)) {
    return storedUrl;
  }

  // Priority 2: Build URL from type + metadata
  const {
    leaseId,
    requestId,
    applicationId,
    viewingId,
    offerId,
    inventoryId,
    propertyId,
    conversationId,
    redirect_url,
  } = metadata;

  const landlordBase = '/enhancedlandlorddashboard';
  const tenantBase = '/tenant-dashboard';

  // Helper: append ?property=xxx to a landlord path when we have propertyId
  const landlordPath = (path: string, extra?: string) => {
    const params = new URLSearchParams();
    if (propertyId) params.set('property', propertyId);
    if (extra) {
      // extra is already in "key=val&key=val" form
      extra.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) params.set(k, v);
      });
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  switch (notification.type) {
    // ── Lease ───────────────────────────────────────────────────────────────
    case 'lease':
      if (leaseId) return `/lease/sign/${leaseId}`;
      if (isLandlord) return landlordPath(`${landlordBase}/leases`);
      return `${tenantBase}/leases`;

    // ── Maintenance ─────────────────────────────────────────────────────────
    case 'maintenance':
      if (requestId) return `/maintenance/${requestId}`;
      if (isLandlord) return landlordPath(`${landlordBase}/maintenance`);
      return `${tenantBase}/maintenance`;

    // ── Application ─────────────────────────────────────────────────────────
    case 'application':
      if (isLandlord) {
        // Land landlords directly on their applications tab for the right property
        if (propertyId) return landlordPath(`${landlordBase}/applications`);
        if (applicationId) return `/application/${applicationId}`;
        return `${landlordBase}/applications`;
      }
      return applicationId ? `/application/${applicationId}` : `${tenantBase}/applications`;

    // ── Payment ─────────────────────────────────────────────────────────────
    case 'payment':
      if (isLandlord) return landlordPath(`${landlordBase}/payments`);
      return `${tenantBase}/payments`;

    // ── Viewing ─────────────────────────────────────────────────────────────
    case 'viewing':
      if (isLandlord) {
        const extra = viewingId ? `tab=viewings&viewingId=${viewingId}` : 'tab=viewings';
        return landlordPath(`${landlordBase}/applications`, extra);
      }
      return viewingId
        ? `${tenantBase}/viewings?id=${viewingId}`
        : `${tenantBase}/viewings`;

    // ── Inventory ────────────────────────────────────────────────────────────
    case 'inventory':
      if (isLandlord) {
        const extra = inventoryId ? `id=${inventoryId}` : undefined;
        return landlordPath(`${landlordBase}/inventory`, extra);
      }
      return inventoryId
        ? `${tenantBase}/inventory?id=${inventoryId}`
        : `${tenantBase}/inventory`;

    // ── Offer ────────────────────────────────────────────────────────────────
    case 'offer':
      if (offerId) return `/application/${offerId}`;
      if (applicationId) return `/application/${applicationId}`;
      if (isLandlord) return landlordPath(`${landlordBase}/applications`);
      return '/applications';

    // ── Message ──────────────────────────────────────────────────────────────
    case 'message':
      return conversationId ? `/messages?c=${conversationId}` : '/messages';

    // ── System ───────────────────────────────────────────────────────────────
    case 'system':
      if (redirect_url) return redirect_url;
      break;

    // ── KYC ──────────────────────────────────────────────────────────────────
    case 'kyc':
      return '/verify-id';

    default:
      if (conversationId) return `/messages?c=${conversationId}`;
      if (propertyId && isLandlord) return landlordPath(landlordBase);
      if (propertyId) return `/property/${propertyId}`;
  }

  return isLandlord ? landlordBase : tenantBase;
};

/**
 * Patterns that are known to cause 404s — rebuild from type+metadata instead.
 */
function isValidRoute(url: string, isLandlord: boolean): boolean {
  if (!url || !url.startsWith('/')) return false;

  const brokenPatterns = [
    /^\/enhanced(landlord|tenant)dashboard\/leases\/.+/,
    /^\/enhanced(landlord|tenant)dashboard\/applications\/.+/,
    /^\/enhanced(landlord|tenant)dashboard\/viewings\/.+/,
    /^\/enhanced(landlord|tenant)dashboard\/offers\/.+/,
    /^\/enhanced(landlord|tenant)dashboard\/inventory\/.+/,
    /^\/enhanced(landlord|tenant)dashboard\/maintenance\/.+/,
    /^\/tenant\/viewings$/,
    // The tenant app never mounted routes under /enhancedtenantdashboard except
    // the bare path and /leases — anything else here is a stale stored URL
    // from before notification links were fixed to use /tenant-dashboard.
    /^\/enhancedtenantdashboard\/(maintenance|payments|viewings|inventory|applications)(\/.*)?$/,
  ];

  // /leases and /applications only exist as top-level routes in the landlord app
  if (!isLandlord && (url === '/leases' || url === '/applications')) {
    return false;
  }

  return !brokenPatterns.some(p => p.test(url));
}

/** Canonical URL builders — use these when creating notifications */
export const NotificationUrls = {
  lease: (leaseId: string) => `/lease/sign/${leaseId}`,
  leaseList: (isLandlord: boolean) =>
    isLandlord ? '/leases' : '/tenant-dashboard/leases',

  application: (applicationId: string) => `/application/${applicationId}`,
  applicationList: (isLandlord: boolean) =>
    isLandlord ? '/applications' : '/tenant-dashboard/applications',

  maintenance: (ticketId: string) => `/maintenance/${ticketId}`,
  maintenanceDashboard: (isLandlord: boolean) =>
    isLandlord
      ? '/enhancedlandlorddashboard/maintenance'
      : '/tenant-dashboard/maintenance',

  viewing: (viewingId: string, isLandlord: boolean) =>
    isLandlord
      ? `/enhancedlandlorddashboard/applications?tab=viewings&viewingId=${viewingId}`
      : `/tenant-dashboard/viewings?id=${viewingId}`,
  viewingList: (isLandlord: boolean) =>
    isLandlord
      ? '/enhancedlandlorddashboard/applications?tab=viewings'
      : '/tenant-dashboard/viewings',

  inventory: (inventoryId: string, isLandlord: boolean) =>
    isLandlord
      ? `/enhancedlandlorddashboard/inventory?id=${inventoryId}`
      : `/tenant-dashboard/inventory?id=${inventoryId}`,

  payment: (isLandlord: boolean) =>
    isLandlord
      ? '/enhancedlandlorddashboard/payments'
      : '/tenant-dashboard/payments',

  messages: (conversationId?: string) =>
    conversationId ? `/messages?c=${conversationId}` : '/messages',

  property: (propertyId: string) => `/property/${propertyId}`,
  verifyId: () => '/verify-id',

  dashboard: (isLandlord: boolean) =>
    isLandlord ? '/enhancedlandlorddashboard' : '/tenant-dashboard',
};
