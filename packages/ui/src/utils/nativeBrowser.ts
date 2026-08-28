// Native-aware URL opening.
//
// In a Capacitor build, `window.open`/`target="_blank"` and full-page
// `window.location = <external>` redirects don't behave: they either no-op or
// navigate the app's own webview away to a website that can't get back. These
// helpers route through the in-app browser (@capacitor/browser) on native and
// fall back to normal browser behaviour on web. They read the Capacitor global
// (window.Capacitor) rather than importing the plugin, so the web bundles don't
// need the dependency.

function cap(): any {
  return typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
}

/** True when running inside the native (Capacitor) app. */
export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.();
}

/** Open an external URL / document. In-app browser on native, new tab on web. */
export async function openExternalUrl(url: string): Promise<void> {
  const c = cap();
  if (c?.isNativePlatform?.() && c.Plugins?.Browser?.open) {
    try { await c.Plugins.Browser.open({ url }); return; } catch { /* fall through to web */ }
  }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a payment/checkout URL.
 * - Web: full-page redirect (unchanged) → returns 'redirected'.
 * - Native: opens the gateway in the in-app browser and resolves 'closed' once
 *   the user dismisses it, so the caller can refresh server-confirmed state
 *   (the payment webhook is the source of truth, not the redirect).
 */
export async function openCheckoutUrl(url: string): Promise<'redirected' | 'closed'> {
  const c = cap();
  if (c?.isNativePlatform?.() && c.Plugins?.Browser?.open) {
    return await new Promise<'closed'>((resolve) => {
      let settled = false;
      let handle: any;
      const finish = () => {
        if (settled) return;
        settled = true;
        try { handle?.remove?.(); } catch {}
        resolve('closed');
      };
      try {
        Promise.resolve(c.Plugins.Browser.addListener?.('browserFinished', finish))
          .then((h: any) => { handle = h; if (settled) { try { h?.remove?.(); } catch {} } })
          .catch(() => {});
      } catch { /* no listener support — user close still resolvable elsewhere */ }
      Promise.resolve(c.Plugins.Browser.open({ url })).catch(() => finish());
    });
  }
  if (typeof window !== 'undefined') window.location.href = url;
  return 'redirected';
}
