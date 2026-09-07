/// <reference types="vite/client" />

// Post-authentication routing helpers, shared by the tenant/landlord/web Auth
// pages so redirect behaviour can't drift between apps.

/**
 * A `returnTo` value is only safe to navigate to if it's a same-origin relative
 * path. Reject absolute URLs, protocol-relative (`//host`) and scheme values to
 * prevent an open redirect from a tampered sessionStorage entry.
 */
export function isSafeReturnTo(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//');
}

/** Consume the stored `returnTo`, returning it only if it's a safe relative path. */
export function takeReturnTo(): string | null {
  const value = sessionStorage.getItem('returnTo');
  if (value) sessionStorage.removeItem('returnTo');
  return isSafeReturnTo(value) ? value : null;
}

/**
 * The sibling app's base URL for cross-app handoff, from build-time env. Returns
 * undefined when unset (local/dev), so callers fall back to the in-app
 * "Wrong App" guard instead of navigating the webview to a website.
 */
export function crossAppUrl(target: 'tenant' | 'landlord'): string | undefined {
  const url = target === 'landlord'
    ? import.meta.env.VITE_LANDLORD_APP_URL
    : import.meta.env.VITE_TENANT_APP_URL;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}
