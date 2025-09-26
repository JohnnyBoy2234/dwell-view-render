import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { PropertyFeatures } from '@/components/property/PropertyFeatures';
import { usePropertyNavigation } from '@/hooks/usePropertyNavigation';
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
}: PropertyCardProps) => {
  const { navigateToProperty, handleKeyDown } = usePropertyNavigation(id);

  const formattedPrice = `${PROPERTY_CARD_CURRENCY.SYMBOL}${price.toLocaleString()}${PROPERTY_CARD_CURRENCY.SEPARATOR}`;
  const altText = `${type} in ${location}`;
  const locationText = `${type} in ${location}`;

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
        <img
          src={image}
          alt={altText}
          className={PROPERTY_CARD_STYLES.IMAGE}
          loading="lazy"
        />
        {featured && (
          <Badge className={PROPERTY_CARD_STYLES.FEATURED_BADGE}>
            {PROPERTY_CARD_LABELS.FEATURED}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;