import { Bed, Bath, Car, Star } from "lucide-react";
import { usePropertyNavigation } from '@/hooks/usePropertyNavigation';
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton';
import { PROPERTY_CARD_CURRENCY } from '@mzanzihomes/common/constants/propertyCardConstants';
import { cn } from '@mzanzihomes/common/lib/utils';

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  parking: number;
  image: string;
  type: string;
  featured?: boolean;
  isSale?: boolean;
  // kept for API compat — not shown on card, handled on detail page
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  preferred_contact_method?: string;
}

const PropertyCard = ({
  id,
  location,
  price,
  beds,
  baths,
  parking,
  image,
  type,
  featured = false,
  isSale = false,
}: PropertyCardProps) => {
  const { navigateToProperty, handleKeyDown } = usePropertyNavigation(id);

  const formattedPrice = `${PROPERTY_CARD_CURRENCY.SYMBOL}${price.toLocaleString()}${isSale ? '' : PROPERTY_CARD_CURRENCY.SEPARATOR}`;

  // Suburb + city only — drop street/number prefix
  const locationParts = location.split(',').map(p => p.trim()).filter(Boolean);
  const displayLocation = locationParts.length >= 2
    ? `${locationParts[locationParts.length - 2]}, ${locationParts[locationParts.length - 1]}`
    : location;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={navigateToProperty}
      onKeyDown={handleKeyDown}
      aria-label={`${type} in ${displayLocation} — ${formattedPrice}`}
      className={cn(
        'group cursor-pointer rounded-xl overflow-hidden',
        'bg-white border border-black/[0.06]',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'active:translate-y-0 active:shadow-none',
      )}
    >
      {/* ── Image ──────────────────────────────────── */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <ImageWithSkeleton
          src={image}
          alt={`${type} in ${displayLocation}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          aspectRatio="16/9"
        />

        {featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-400 text-amber-900 leading-none">
            <Star className="w-2.5 h-2.5 fill-current shrink-0" aria-hidden />
            Featured
          </span>
        )}
      </div>

      {/* ── Info ───────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-3 space-y-1">
        {/* Price — dominant, tabular so digits don't shift */}
        <p className="text-[15px] font-bold tracking-tight tabular-nums text-foreground leading-none">
          {formattedPrice}
        </p>

        {/* Type · Location */}
        <p className="text-xs text-muted-foreground truncate leading-tight">
          {type} &middot; {displayLocation}
        </p>

        {/* Features */}
        <div className="flex items-center gap-2.5 pt-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Bed className="w-3 h-3 shrink-0" aria-hidden />
            {beds}
          </span>
          <span className="flex items-center gap-0.5">
            <Bath className="w-3 h-3 shrink-0" aria-hidden />
            {baths}
          </span>
          {parking > 0 && (
            <span className="flex items-center gap-0.5">
              <Car className="w-3 h-3 shrink-0" aria-hidden />
              {parking}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default PropertyCard;
