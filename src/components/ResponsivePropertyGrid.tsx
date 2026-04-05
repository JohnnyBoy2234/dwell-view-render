import * as React from 'react';
import PropertyCard from './PropertyCard';
import { Home } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  images: string[];
  property_type: string;
  featured: boolean;
  listing_type?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  preferred_contact_method?: string;
}

interface ResponsivePropertyGridProps {
  properties: Property[];
  loading?: boolean;
  onClearFilters?: () => void;
  onShowAllProperties?: () => void;
  isSale?: boolean;
}

// Skeleton matches PropertyCard proportions exactly
function CardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden bg-white border border-black/[0.06] animate-pulse"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-video bg-muted" />
      <div className="px-3 pt-2.5 pb-3 space-y-2">
        <div className="h-3.5 bg-muted rounded-sm w-2/5" />
        <div className="h-2.5 bg-muted rounded-sm w-3/5" />
        <div className="flex gap-3 pt-0.5">
          <div className="h-2.5 bg-muted rounded-sm w-6" />
          <div className="h-2.5 bg-muted rounded-sm w-6" />
          <div className="h-2.5 bg-muted rounded-sm w-6" />
        </div>
      </div>
    </div>
  );
}

export const ResponsivePropertyGrid: React.FC<ResponsivePropertyGridProps> = ({
  properties,
  loading = false,
  onClearFilters,
  isSale = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
          <Home className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No properties found</p>
        <p className="text-xs text-muted-foreground mb-4">Try adjusting your filters</p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs font-semibold text-primary underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {properties.map((property, idx) => (
        <div
          key={property.id}
          className="animate-in fade-in slide-in-from-bottom-2"
          style={{
            animationDelay: `${Math.min(idx, 15) * 40}ms`,
            animationFillMode: 'both',
            animationDuration: '380ms',
            animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
          }}
        >
          <PropertyCard
            id={property.id}
            title={property.property_type}
            location={property.location}
            price={property.price}
            beds={property.bedrooms}
            baths={property.bathrooms}
            parking={property.parking_spaces}
            image={property.images?.[0] || 'https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=500&h=300&fit=crop'}
            type={property.property_type}
            featured={property.featured}
            isSale={isSale}
            contact_name={property.contact_name}
            contact_phone={property.contact_phone}
            contact_email={property.contact_email}
            preferred_contact_method={property.preferred_contact_method}
          />
        </div>
      ))}
    </div>
  );
};
