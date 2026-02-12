import React from 'react';
import { Control } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, DollarSign } from 'lucide-react';

interface ListingTypeStepProps {
  control: Control<any>;
  errors: any;
}

const listingTypes = [
  {
    id: 'rent',
    title: 'Rental Property',
    description: 'List your property for monthly rent',
    icon: Home,
    color: 'bg-blue-500',
    features: ['Monthly rental income', 'Tenant management', 'Lease agreements']
  },
  {
    id: 'sale',
    title: 'Property for Sale',
    description: 'Sell your property outright',
    icon: DollarSign,
    color: 'bg-green-500',
    features: ['One-time sale price', 'Transfer process', 'Ownership transfer']
  }
];

export default function ListingTypeStep({ control, errors }: ListingTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">What type of listing?</h2>
        <p className="text-muted-foreground">Choose whether you want to rent or sell your property</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {listingTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <Card 
              key={type.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => {
                // This will be handled by the Controller component
                const radioInput = document.querySelector(`input[value="${type.id}"]`) as HTMLInputElement;
                if (radioInput) {
                  radioInput.click();
                }
              }}
            >
              <CardHeader className="text-center">
                <div className={`w-16 h-16 rounded-full ${type.color} flex items-center justify-center mx-auto mb-4`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{type.title}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {type.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Badge variant={type.id === 'rent' ? 'default' : 'secondary'}>
                    {type.id === 'rent' ? 'Popular' : 'Available'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hidden radio inputs for form control */}
      <div className="hidden">
        {listingTypes.map((type) => (
          <label key={type.id} className="flex items-center space-x-2">
            <input
              type="radio"
              name="listing_type"
              value={type.id}
              {...control.register('listing_type', { required: 'Please select a listing type' })}
            />
            <span>{type.title}</span>
          </label>
        ))}
      </div>

      {errors.listing_type && (
        <p className="text-sm text-destructive text-center">{errors.listing_type.message}</p>
      )}
    </div>
  );
}
