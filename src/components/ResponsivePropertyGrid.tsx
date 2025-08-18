import React from 'react';
import PropertyCard from './PropertyCard';
import { NoResultsMessage } from './search/NoResultsMessage';

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
}

interface ResponsivePropertyGridProps {
  properties: Property[];
  loading?: boolean;
  onClearFilters?: () => void;
  onShowAllProperties?: () => void;
}

export const ResponsivePropertyGrid: React.FC<ResponsivePropertyGridProps> = ({
  properties,
  loading = false,
  onClearFilters,
  onShowAllProperties
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
      <NoResultsMessage 
        onClearFilters={onClearFilters || (() => {})}
        onShowAllProperties={onShowAllProperties || (() => {})}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
      {properties.map((property) => (
        <div key={property.id} className="animate-fade-in">
          <PropertyCard
            id={property.id}
            title={property.title}
            location={property.location}
            price={property.price}
            beds={property.bedrooms}
            baths={property.bathrooms}
            parking={property.parking_spaces}
            image={property.images?.[0] || `https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=500&h=300&fit=crop`}
            type={property.property_type}
            featured={property.featured}
          />
        </div>
      ))}
    </div>
  );
};