// Capacitor global (read directly so this low-level package needs no plugin dep).
function nativeCap(): any {
  return typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
}
// In the native app (WKWebView), <a download> and blob object URLs are ignored,
// so a "download" silently does nothing. Opening the file in the in-app browser
// (Capacitor Browser) lets iOS/Android display the PDF and offer share/save.
async function openInNativeBrowser(url: string): Promise<boolean> {
  const c = nativeCap();
  if (c?.isNativePlatform?.() && c.Plugins?.Browser?.open && !url.startsWith('data:')) {
    try { await c.Plugins.Browser.open({ url }); return true; } catch { return false; }
  }
  return false;
}

export async function downloadFileFromUrl(fileUrl: string, suggestedFileName: string): Promise<void> {
  if (!fileUrl) return;

  // Native app: browser-based download attributes don't work — hand off to the
  // in-app browser instead so the file actually opens.
  if (await openInNativeBrowser(fileUrl)) return;

  // Data URL: direct anchor download
  if (fileUrl.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = suggestedFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // For signed URLs from Supabase, use direct download approach
  if (fileUrl.includes('token=') && fileUrl.includes('Signature=')) {
    console.log('Using direct download for signed URL');
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = suggestedFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Try fetch → blob → object URL for maximum reliability
  try {
    const response = await fetch(fileUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = suggestedFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    return;
  } catch (error) {
    console.error('Fetch download failed:', error);
    // Don't fallback to direct navigation for signed URLs as it causes 404s
    if (fileUrl.includes('supabase.co/storage')) {
      throw new Error('Failed to download file from storage');
    }
    
    // Fallback to direct anchor with cache-busting query params for other URLs
    const link = document.createElement('a');
    const joiner = fileUrl.includes('?') ? '&' : '?';
    link.href = `${fileUrl}${joiner}download=${encodeURIComponent(suggestedFileName)}&ts=${Date.now()}`;
    link.download = suggestedFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function openUrlInNewTab(url: string): void {
  if (!url) return;
  const c = nativeCap();
  if (c?.isNativePlatform?.() && c.Plugins?.Browser?.open && !url.startsWith('data:')) {
    // Native: window.open is a no-op in WKWebView — use the in-app browser.
    c.Plugins.Browser.open({ url }).catch(() => {});
    return;
  }
  const joiner = url.includes('?') ? '&' : '?';
  const finalUrl = url.startsWith('data:') ? url : `${url}${joiner}ts=${Date.now()}`;
  window.open(finalUrl, '_blank');
}


