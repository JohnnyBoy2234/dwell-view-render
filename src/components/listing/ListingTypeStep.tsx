import * as React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Home, DollarSign } from 'lucide-react';
import { ListingFormData } from '@/pages/ListProperty';

interface ListingTypeStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
}

const listingTypes = [
  {
    value: 'rent',
    label: 'Rental Property',
    description: 'List your property for monthly rent',
    icon: Home
  },
  {
    value: 'sale',
    label: 'Property for Sale',
    description: 'List your property for sale',
    icon: DollarSign
  }
];

export default function ListingTypeStep({ control, errors }: ListingTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">What would you like to do?</h2>
        <p className="text-muted-foreground">Choose whether you're renting or selling</p>
      </div>

      <Controller
        name="listing_type"
        control={control}
        rules={{ required: 'Please select a listing type' }}
        render={({ field }) => (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {listingTypes.map((type) => {
              const IconComponent = type.icon;
              const isSelected = field.value === type.value;

              return (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => field.onChange(type.value)}
                >
                  <CardContent className="p-8 text-center">
                    <IconComponent
                      className={`h-16 w-16 mx-auto mb-4 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <h3 className="text-lg font-semibold mb-2">{type.label}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      />

      {errors.listing_type && (
        <p className="text-sm text-destructive text-center">{errors.listing_type.message}</p>
      )}
    </div>
  );
}
