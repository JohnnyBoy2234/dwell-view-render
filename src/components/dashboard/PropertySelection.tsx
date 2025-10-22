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
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-ocean-blue to-success-green bg-clip-text text-transparent">
          Select a Property
        </h2>
        <p className="text-muted-foreground">Choose a property to view its dashboard and manage its details</p>
      </div>

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((property) => (
          <Card 
            key={property.id}
            className="overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-200 border border-ocean-blue/10 hover:border-ocean-blue/30 hover:ring-1 hover:ring-ocean-blue/20"
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
            </div>

            {/* Property Details */}
            <CardContent className="p-4 space-y-3">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                  {property.title}
                </h3>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {getSuburbAndCity(property.location)}
                </div>
              </div>
              <div className="pt-3 border-t">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProperty(property.id);
                  }}
                  className="w-full bg-ocean-blue hover:bg-ocean-blue/90 text-white"
                >
                  Manage Tools
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
    </div>
  );
}
