import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Plus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RIcon } from '@/components/icons/RIcon';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Select a Property</h2>
        <p className="text-muted-foreground">Choose a property to view its dashboard and manage its details</p>
      </div>

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card 
            key={property.id}
            className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary"
            onClick={() => onSelectProperty(property.id)}
          >
            {/* Property Image */}
            <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-ocean-blue/10 to-success-green/10">
              {property.images && property.images.length > 0 ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <Badge 
                  variant="secondary" 
                  className="bg-background/90 backdrop-blur-sm"
                >
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(property.status)} mr-2`} />
                  {property.status}
                </Badge>
              </div>
            </div>

            {/* Property Details */}
            <CardContent className="p-6 space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                  {property.title}
                </h3>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.location}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center text-lg font-bold text-primary">
                  <RIcon className="h-5 w-5 mr-1" />
                  {property.price.toLocaleString()}/mo
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProperty(property.id);
                  }}
                  className="group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  Manage
                </Button>
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
  );
}
