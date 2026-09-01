// Shared Google Maps JS loader. Loads the API (with the Places library) exactly
// once and hands back the `google` global, so every feature that needs place
// suggestions — the address field and the area search — share one script tag
// and one key.
//
// The key is baked in at BUILD time from VITE_GOOGLE_MAPS_API_KEY (Vite reads
// .env / CI env, NOT Supabase). If it's missing, the loader rejects and callers
// fall back gracefully.
//
// Native note: if your Google key is restricted by HTTP referrer, add the app
// origins (capacitor://localhost and https://localhost) or the API rejects
// requests from inside the Capacitor app.

let loadPromise: Promise<any> | null = null;

export function googleMapsKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
}

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve(w.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const apiKey = googleMapsKey();
    if (!apiKey) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set (must be present at build time).'));
      return;
    }

    const finish = () => {
      if (w.google?.maps?.places) resolve(w.google);
      else reject(new Error('Google Maps loaded without the Places library.'));
    };

    // Script already injected elsewhere — wait for it.
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      const iv = setInterval(() => {
        if (w.google?.maps?.places) { clearInterval(iv); finish(); }
      }, 100);
      setTimeout(() => { clearInterval(iv); finish(); }, 10000);
      return;
    }

    const cbName = '__initGoogleMapsShared';
    w[cbName] = () => finish();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps (check key/network).'));
    document.head.appendChild(script);
  });

  // Let a failed attempt be retried on the next call.
  loadPromise.catch(() => { loadPromise = null; });
  return loadPromise;
}

/**
 * Return area/place predictions (suburbs, towns, regions) for a query,
 * restricted to South Africa. Returns [] if Maps isn't available so callers can
 * fall back to a static list. Each item's `description` is the display string.
 */
export async function getAreaPredictions(input: string): Promise<Array<{ description: string; placeId: string }>> {
  if (!input || input.trim().length < 2) return [];
  let google: any;
  try {
    google = await loadGoogleMaps();
  } catch (e) {
    // Most common: key missing at build time, or script blocked. Surface it so
    // "no suggestions" isn't silent.
    console.warn('[places] Google Maps not loaded:', (e as Error)?.message || e);
    return [];
  }
  const service = new google.maps.places.AutocompleteService();
  return await new Promise((resolve) => {
    service.getPlacePredictions(
      { input, componentRestrictions: { country: 'za' }, types: ['(regions)'] },
      (predictions: any[], status: string) => {
        const S = google.maps.places.PlacesServiceStatus;
        if (status === S.ZERO_RESULTS) { resolve([]); return; }
        if (status !== S.OK || !predictions) {
          // REQUEST_DENIED => key restriction or the (legacy) Places API isn't
          // enabled; OVER_QUERY_LIMIT => billing/quota. Log the exact status.
          console.warn('[places] getPlacePredictions status:', status);
          resolve([]);
          return;
        }
        resolve(predictions.map((p) => ({ description: p.description, placeId: p.place_id })));
      },
    );
  });
}
