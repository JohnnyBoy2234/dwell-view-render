import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, Bed, Bath, Car, Ruler, DollarSign, Calendar, Camera } from 'lucide-react';
import { ListingFormData } from '@/pages/ListProperty';

interface ReviewStepProps {
  formData: ListingFormData;
}

export default function ReviewStep({ formData }: ReviewStepProps) {
  const {
    property_type,
    location,
    title,
    description,
    bedrooms,
    bathrooms,
    parking_spaces,
    size_sqm,
    furnished,
    pets_allowed,
    amenities,
    price,
    available_from,
    images
  } = formData;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Review your listing</h2>
        <p className="text-muted-foreground">Check everything looks good before publishing</p>
      </div>

      {/* Preview Card */}
      <Card className="overflow-hidden">
        <div className="aspect-video bg-muted relative">
          {images && images.length > 0 ? (
            <img
              src={URL.createObjectURL(images[0])}
              alt="Property main"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
            {images?.length || 0} photos
          </div>
        </div>
        
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                {location}
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                {bedrooms} bed{bedrooms !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                {bathrooms} bath{bathrooms !== 1 ? 's' : ''}
              </div>
              {parking_spaces > 0 && (
                <div className="flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  {parking_spaces} parking
                </div>
              )}
              {size_sqm && (
                <div className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  {size_sqm}sqm
                </div>
              )}
            </div>
            
            <div className="text-2xl font-bold text-primary">
              R{price?.toLocaleString()} / month
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{property_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bedrooms:</span>
              <span className="font-medium">{bedrooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bathrooms:</span>
              <span className="font-medium">{bathrooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parking:</span>
              <span className="font-medium">{parking_spaces || 'None'}</span>
            </div>
            {size_sqm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{size_sqm}sqm</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Furnished:</span>
              <span className="font-medium">{furnished ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pet Friendly:</span>
              <span className="font-medium">{pets_allowed ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monthly Rent:</span>
              <span className="font-bold text-lg text-primary">R{price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available From:</span>
              <span className="font-medium">
                {available_from ? new Date(available_from).toLocaleDateString() : 'Immediately'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>

      {/* Amenities */}
      {amenities && amenities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary">
                  {amenity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}