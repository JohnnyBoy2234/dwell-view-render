import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Building2, Building, Warehouse } from 'lucide-react';
import { ListingFormData } from '@/pages/ListProperty';

interface PropertyTypeStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
}

const propertyTypes = [
  {
    value: 'Apartment',
    label: 'Apartment',
    description: 'Unit in a residential building',
    icon: Building2
  },
  {
    value: 'House',
    label: 'House',
    description: 'Standalone house',
    icon: Home
  },
  {
    value: 'Townhouse',
    label: 'Townhouse',
    description: 'Multi-story house sharing walls',
    icon: Building
  },
  {
    value: 'Studio',
    label: 'Studio',
    description: 'Open plan living space',
    icon: Warehouse
  },
  {
    value: 'Flat',
    label: 'Flat',
    description: 'Self-contained housing unit',
    icon: Building2
  },
  {
    value: 'Room',
    label: 'Room',
    description: 'Single room rental',
    icon: Home
  }
];

export default function PropertyTypeStep({ control, errors }: PropertyTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">What type of property are you listing?</h2>
        <p className="text-muted-foreground">Choose the option that best describes your property</p>
      </div>

      <Controller
        name="property_type"
        control={control}
        rules={{ required: 'Please select a property type' }}
        render={({ field }) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertyTypes.map((type) => {
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
                  <CardContent className="p-6 text-center">
                    <IconComponent
                      className={`h-12 w-12 mx-auto mb-4 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <h3 className="font-semibold mb-2">{type.label}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      />

      {errors.property_type && (
        <p className="text-sm text-destructive text-center">{errors.property_type.message}</p>
      )}
    </div>
  );
}