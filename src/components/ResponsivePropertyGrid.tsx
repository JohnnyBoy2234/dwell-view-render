import * as React from 'react';
import PropertyCard from './PropertyCard';
import { NoResultsMessage } from './search/NoResultsMessage';
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

export const ResponsivePropertyGrid: React.FC<ResponsivePropertyGridProps> = ({
  properties,
  loading = false,
  onClearFilters,
  onShowAllProperties,
  isSale = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-muted rounded-lg aspect-[4/3] mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Properties Available</h3>
          <p className="text-muted-foreground">
            There are currently no properties available. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 items-stretch">
      {properties.map((property) => (
        <div key={property.id} className="animate-fade-in h-full">
          <PropertyCard
            id={property.id}
            title={isSale ? `R${property.price.toLocaleString()}` : `R${property.price.toLocaleString()}/month`}
            location={property.location}
            price={property.price}
            beds={property.bedrooms}
            baths={property.bathrooms}
            parking={property.parking_spaces}
            image={property.images?.[0] || `https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=500&h=300&fit=crop`}
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