import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Plus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RIcon } from '@/components/icons/RIcon';
import { PROPERTY_CARD_STYLES } from '@/constants/propertyCardConstants';

interface Property {
  id: string;
  title: string;
  location: string;
  images: string[];
  price: number;
  status: string;
}

interface PropertySelectionProps {
  properties: Property[];
  onSelectProperty: (propertyId: string) => void;
  loading?: boolean;
}

export function PropertySelection({ properties, onSelectProperty, loading }: PropertySelectionProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-blue-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSuburbAndCity = (location: string) => {
    if (!location) return location;
    const parts = location.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const suburb = parts[parts.length - 2];
      const city = parts[parts.length - 1];
      return `${suburb}, ${city}`;
    }
    return location;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Select a Property</h2>
          <p className="text-muted-foreground">Choose a property to manage</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No Properties Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building your rental portfolio by adding your first property
            </p>
            <Button size="lg" onClick={() => navigate('/add-property')}>
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-normal text-black">
          Select a Property
        </h2>
        <p className="text-black/80">Choose a property to view its dashboard and manage its details</p>
      </div>

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card 
            key={property.id}
            className={PROPERTY_CARD_STYLES.CARD}
            role="button"
            tabIndex={0}
            onClick={() => onSelectProperty(property.id)}
            aria-label={`Manage ${property.title} in ${getSuburbAndCity(property.location)}`}
          >
            {/* Property Image */}
            <div className={`${PROPERTY_CARD_STYLES.IMAGE_CONTAINER} aspect-video`}>
              {property.images && property.images.length > 0 ? (
                <img
                  src={property.images[0]}
                  alt={`${property.title} in ${getSuburbAndCity(property.location)}`}
                  className={`${PROPERTY_CARD_STYLES.IMAGE} h-full`}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/30">
                  <Home className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Property Details */}
            <CardContent className={PROPERTY_CARD_STYLES.CONTENT}>
              <div className={PROPERTY_CARD_STYLES.CONTENT_INNER}>
                {/* Price */}
                <h3 className={PROPERTY_CARD_STYLES.PRICE}>
                  R{property.price?.toLocaleString?.()}/month
                </h3>

                {/* Location */}
                <div className={PROPERTY_CARD_STYLES.LOCATION_CONTAINER}>
                  <MapPin className={PROPERTY_CARD_STYLES.LOCATION_ICON} aria-hidden="true" />
                  <span className={PROPERTY_CARD_STYLES.LOCATION_TEXT}>
                    {getSuburbAndCity(property.location)}
                  </span>
                </div>

                {/* CTA */}
                <div className="mt-3 pt-3 border-t">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProperty(property.id);
                    }}
                    className="w-full bg-ocean-blue hover:bg-ocean-blue/90 text-white"
                  >
                    Management Tools
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Property Button */}
      <div className="flex justify-center pt-6">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => navigate('/add-property')}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Another Property
        </Button>
      </div>
      </div>
    </div>
  );
}
