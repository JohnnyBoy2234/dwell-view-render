import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton';
import { ChevronLeft, Home, MapPin } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  images: string[];
  price: number;
  status: string;
}

interface PropertyHeaderProps {
  property: Property;
  onBack: () => void;
}

export function PropertyHeader({ property, onBack }: PropertyHeaderProps) {
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'default';
      case 'occupied':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Back Button + Property Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBack}
            className="flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            All Properties
          </Button>

          <div className="h-8 w-px bg-border" />

          {/* Property Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-ocean-blue/10">
              {property.images && property.images.length > 0 ? (
                <ImageWithSkeleton
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  aspectRatio="square"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">
                {property.title}
              </h3>
              <Badge variant={getStatusVariant(property.status)}>
                {property.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{property.location}</span>
              </div>
              <div className="font-medium text-primary">
                R{property.price.toLocaleString()}/month
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
