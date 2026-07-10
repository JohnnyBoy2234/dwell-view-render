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
      extra.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) params.set(k, v);
      });
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  // Priority 1: a stored URL — but only if it's actually a route that exists
  // for this app/role. Legacy links (/dashboard, /admin, /lease-signing,
  // /tenant/payments, the other role's dashboard, …) are rejected and rebuilt.
  let storedUrl =
    notification.action_url ||
    notification.link_url ||
    notification.actionUrl ||
    notification.linkUrl;
  // Normalise a couple of known-renamed paths before validating.
  if (storedUrl) {
    const m = storedUrl.match(/^\/lease-signing\/([^/?#]+)/);
    if (m) storedUrl = `/lease/sign/${m[1]}`;
  }
  if (storedUrl && isValidRoute(storedUrl, isLandlord)) {
    return storedUrl;
  }

  // Priority 2: build from a normalised "kind" (stored types vary a lot:
  // lease_sent, application_submitted, viewing_booked, payment_reminder, …).
  const t = (notification.type || '').toLowerCase();
  const kind =
    t.includes('message') ? 'message'
    : t.includes('lease') ? 'lease'
    : (t.includes('application') || t.includes('offer')) ? 'application'
    : t.includes('viewing') ? 'viewing'
    : t.includes('maintenance') ? 'maintenance'
    : (t.includes('payment') || t.includes('billing')) ? 'payment'
    : t.includes('condition') ? 'condition_record'
    : t.includes('inventory') ? 'inventory'
    : t.includes('kyc') ? 'kyc'
    : 'other';

  switch (kind) {
    case 'message':
      return conversationId ? `/messages?c=${conversationId}` : '/messages';

    case 'lease':
      if (leaseId) return `/lease/sign/${leaseId}`;
      return isLandlord ? landlordPath(`${landlordBase}/leases`) : `${tenantBase}/leases`;

    case 'application':
      if (applicationId) return `/application/${applicationId}`;
      if (offerId) return `/application/${offerId}`;
      return isLandlord ? landlordPath(`${landlordBase}/applications`) : `${tenantBase}/applications`;

    case 'viewing':
      if (isLandlord) {
        return landlordPath(`${landlordBase}/applications`, viewingId ? `tab=viewings&viewingId=${viewingId}` : 'tab=viewings');
      }
      return viewingId ? `${tenantBase}/viewings?id=${viewingId}` : `${tenantBase}/viewings`;

    case 'maintenance':
      if (requestId) return `/maintenance/${requestId}`;
      return isLandlord ? landlordPath(`${landlordBase}/maintenance`) : `${tenantBase}/maintenance`;

    case 'payment':
      // Tenant payments live under proof-of-payment; there is no /payments route.
      return isLandlord ? landlordPath(`${landlordBase}/payments`) : `${tenantBase}/proof-of-payment`;

    case 'condition_record':
      return isLandlord
        ? landlordPath(`${landlordBase}/condition-records`)
        : `${tenantBase}/condition-records`;

    case 'inventory':
      if (isLandlord) return landlordPath(`${landlordBase}/inventory`, inventoryId ? `id=${inventoryId}` : undefined);
      return inventoryId ? `${tenantBase}/inventory?id=${inventoryId}` : `${tenantBase}/inventory`;

    case 'kyc':
      return '/verify-id';

    default:
      if (redirect_url && isValidRoute(redirect_url, isLandlord)) return redirect_url;
      if (conversationId) return `/messages?c=${conversationId}`;
      if (propertyId && !isLandlord) return `/property/${propertyId}`;
      if (propertyId && isLandlord) return landlordPath(landlordBase);
      return isLandlord ? landlordBase : tenantBase;
  }
};

/**
 * Allowlist of routes that actually exist for the current app/role. Anything
 * not matched is treated as a stale/foreign link and rebuilt from type+metadata.
 */
function isValidRoute(url: string, isLandlord: boolean): boolean {
  if (!url || !url.startsWith('/')) return false;
  const path = url.split('?')[0].replace(/\/$/, '') || '/';

  // Routes mounted in both apps
  const shared = [
    /^\/messages$/,
    /^\/notifications$/,
    /^\/verify-id$/,
    /^\/lease\/sign\/[^/]+$/,
    /^\/application\/[^/]+$/,
    /^\/maintenance\/[^/]+$/,
    /^\/property\/[^/]+$/,
  ];
  if (shared.some(p => p.test(path))) return true;

  if (isLandlord) {
    return /^\/enhancedlandlorddashboard(\/(applications|maintenance|payments|leases|inventory|properties|profile|condition-records|swiftbooks|notifications))?$/.test(path);
  }
  // Tenant dashboard base + its real sub-routes (note: proof-of-payment, not payments)
  return /^\/(tenant-dashboard|enhancedtenantdashboard)$/.test(path)
    || /^\/tenant-dashboard\/(leases|maintenance|viewings|inventory|applications|proof-of-payment|profile|condition-records|contracts)$/.test(path);
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

  conditionRecord: (isLandlord: boolean) =>
    isLandlord
      ? '/enhancedlandlorddashboard/condition-records'
      : '/tenant-dashboard/condition-records',

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
