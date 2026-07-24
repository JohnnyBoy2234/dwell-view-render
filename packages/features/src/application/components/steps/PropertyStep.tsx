import { MapPin, Home } from 'lucide-react';
import { applicationTheme } from '@mzanzihomes/common/constants/applicationTheme';

export interface PropertySummary {
  id: string;
  title: string;
  location: string;
  price: number | null;
  image: string | null;
}

/**
 * Step 1: a prominent header confirming the property being applied for — large
 * image, "You are applying for" label, then title / address / rent. Keeps the
 * tenant oriented without hunting through the form.
 */
export function PropertyStep({ property }: { property: PropertySummary | null }) {
  if (!property) {
    return <div className="h-56 rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      {/* Large property image */}
      <div className="relative h-48 w-full bg-muted sm:h-56">
        {property.image ? (
          <img src={property.image} alt={property.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Home className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          </div>
        )}
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
          style={{ background: applicationTheme.primary }}
        >
          You are applying for
        </span>
      </div>

      {/* Title / address / rent */}
      <div className="p-4">
        <h3 className="text-[18px] font-bold leading-snug text-slate-900 break-words">{property.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-[13.5px] text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{property.location}</span>
        </p>
        {property.price != null && (
          <p className="mt-2 text-[16px] font-extrabold" style={{ color: applicationTheme.primaryDark }}>
            R{property.price.toLocaleString()}
            <span className="text-[13px] font-medium text-muted-foreground"> / month</span>
          </p>
        )}
      </div>
    </div>
  );
}
