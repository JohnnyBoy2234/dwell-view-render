// @ts-nocheck
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@mzanzihomes/supabase/client';

// In-app viewer for receipt/invoice PDFs stored in the private rent-receipts
// bucket. Documents used to open via target="_blank", which strands the user
// inside the Capacitor WebView with no way back — this page keeps them in the
// app with a real back button.
export default function DocumentViewer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const path = searchParams.get('path') || '';
  const title = searchParams.get('title') || 'Document';

  // The bucket is private, so the URL must be a short-lived signed URL
  // (minted fresh per visit) rather than a stable public URL — this also
  // means the old `?v=` cache-busting param is no longer needed.
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage.from('rent-receipts').createSignedUrl(path, 60 * 10).then(({ data, error }) => {
      if (error) {
        console.error('Failed to sign document URL:', error);
        setUrl(null);
        return;
      }
      setUrl(data?.signedUrl ?? null);
    });
  }, [path]);

  // Android WebViews can't render PDFs inline; Google's viewer wraps the
  // public URL into an embeddable HTML page that works everywhere.
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  const viewerSrc = url
    ? isNative
      ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`
      : url
    : null;

  const goBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate('/tenant-dashboard');

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: 'hsl(214 60% 97%)' }}>
      <header
        className="h-14 flex items-center gap-3 px-3 sm:px-4 border-b border-white/10 sticky z-40 backdrop-blur-md shrink-0"
        style={{ top: 'var(--rent-banner-h, 0px)', background: 'rgba(10,10,20,0.78)' }}
      >
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 min-w-0 text-base font-bold text-white truncate">{title}</h1>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in browser"
            className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors text-gray-300 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </header>

      {viewerSrc ? (
        <iframe src={viewerSrc} title={title} className="flex-1 w-full border-0 bg-white" />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Document not found.
        </div>
      )}
    </div>
  );
}
