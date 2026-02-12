import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { PropertyFeatures } from '@/components/property/PropertyFeatures';
import { usePropertyNavigation } from '@/hooks/usePropertyNavigation';
import { ReportPropertyModal } from '@/components/property/ReportPropertyModal';
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton';
import {
  PROPERTY_CARD_STYLES, 
  PROPERTY_CARD_LABELS, 
  PROPERTY_CARD_CURRENCY 
} from '@/constants/propertyCardConstants';

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
  listingType?: 'rent' | 'sale';
  salePrice?: number | null;
  priceNegotiable?: boolean;
}

/**
 * Property card component for displaying property listings
 * Shows property image, price, location, and key features
 */
const PropertyCard = ({
  id,
  title,
  location,
  price,
  beds,
  baths,
  parking,
  image,
  type,
  featured = false,
  listingType = 'rent',
  salePrice,
  priceNegotiable,
}: PropertyCardProps) => {
  const { navigateToProperty, handleKeyDown } = usePropertyNavigation(id);

  const isSale = listingType === 'sale';
  const displayPrice = isSale && salePrice ? salePrice : price;
  const formattedPrice = isSale 
    ? `${PROPERTY_CARD_CURRENCY.SYMBOL}${displayPrice.toLocaleString()}`
    : `${PROPERTY_CARD_CURRENCY.SYMBOL}${displayPrice.toLocaleString()}${PROPERTY_CARD_CURRENCY.SEPARATOR}`;
  const altText = `${type} in ${location}`;
  const displayLocation = location.split(',')[1] + ' ' + location.split(',')[2];
  const locationText = `${type} in ${displayLocation}`;

  return (
    <Card 
      className={PROPERTY_CARD_STYLES.CARD}
      role="button"
      tabIndex={0}
      onClick={navigateToProperty}
      onKeyDown={handleKeyDown}
      aria-label={`View details for ${locationText}, ${formattedPrice}`}
    >
      <div className={PROPERTY_CARD_STYLES.IMAGE_CONTAINER}>
        <ImageWithSkeleton
          src={image}
          alt={altText}
          className={PROPERTY_CARD_STYLES.IMAGE}
          aspectRatio="4/3"
        />
        {featured && (
          <Badge className={PROPERTY_CARD_STYLES.FEATURED_BADGE}>
            {PROPERTY_CARD_LABELS.FEATURED}
          </Badge>
        )}
        {isSale && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
            For Sale
          </Badge>
        )}
      </div>

      <CardContent className={PROPERTY_CARD_STYLES.CONTENT}>
        <div className={PROPERTY_CARD_STYLES.CONTENT_INNER}>
          <div className={PROPERTY_CARD_STYLES.HEADER}>
            <Badge 
              variant="secondary" 
              className={PROPERTY_CARD_STYLES.TYPE_BADGE}
            >
              {type}
            </Badge>
          </div>
          
          <h3 className={PROPERTY_CARD_STYLES.PRICE}>
            {formattedPrice}
          </h3>
          
          <div className={PROPERTY_CARD_STYLES.LOCATION_CONTAINER}>
            <MapPin 
              className={PROPERTY_CARD_STYLES.LOCATION_ICON}
              aria-hidden="true"
            />
            <span className={PROPERTY_CARD_STYLES.LOCATION_TEXT}>
              {locationText}
            </span>
          </div>

          <PropertyFeatures 
            beds={beds} 
            baths={baths} 
            parking={parking} 
          />
          
          <div className="mt-2">
            <ReportPropertyModal propertyId={id} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;