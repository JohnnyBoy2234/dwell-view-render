import { useState } from 'react';
import { Home } from 'lucide-react';
import { cn } from '@mzanzihomes/common/lib/utils';

interface PropertyThumbnailProps {
  src: string | null | undefined;
  propertyTitle: string;
  className?: string;
  onLoadFailed?: () => void;
}

/**
 * Property photo with a skeleton while loading and an intentional fallback
 * when the URL is missing or dead — the browser's broken-image icon never
 * shows and the region keeps stable dimensions.
 */
export function PropertyThumbnail({ src, propertyTitle, className, onLoadFailed }: PropertyThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`Photo of ${propertyTitle} unavailable`}
        className={cn('flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground', className)}
      >
        <Home className="h-6 w-6" aria-hidden="true" />
        <span className="text-xs">Photo unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
      <img
        src={src}
        alt={`Photo of ${propertyTitle}`}
        loading="lazy"
        className="h-full w-full object-cover"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          onLoadFailed?.();
        }}
      />
    </div>
  );
}
