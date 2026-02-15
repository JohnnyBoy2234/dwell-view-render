import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, User } from "lucide-react";
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
  isSale?: boolean;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  preferred_contact_method?: string;
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
  isSale = false,
  contact_name,
  contact_phone,
  contact_email,
  preferred_contact_method,
}: PropertyCardProps) => {
  const { navigateToProperty, handleKeyDown } = usePropertyNavigation(id);

  const formattedPrice = `${PROPERTY_CARD_CURRENCY.SYMBOL}${price.toLocaleString()}${isSale ? '' : PROPERTY_CARD_CURRENCY.SEPARATOR}`;
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
          
          {/* Contact Information for Sale Listings */}
          {isSale && contact_name && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Contact Seller</span>
              </div>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="font-medium">{contact_name}</div>
                {preferred_contact_method === 'phone' || preferred_contact_method === 'both' ? (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{contact_phone}</span>
                  </div>
                ) : null}
                {preferred_contact_method === 'email' || preferred_contact_method === 'both' ? (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{contact_email}</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          
          <div className="mt-2">
            <ReportPropertyModal propertyId={id} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;