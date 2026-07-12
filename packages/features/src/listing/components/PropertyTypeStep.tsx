import * as React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Input } from '@mzanzihomes/ui/components/input';
import {
  Home,
  Building2,
  Building,
  Trees,
  DoorOpen,
  GraduationCap,
  Store,
  PenLine,
  Layers,
} from 'lucide-react';
import { ListingFormData } from '../types';

interface PropertyTypeStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
}

const groups = [
  {
    heading: 'Homes',
    options: [
      { value: 'House', label: 'House', description: 'Standalone home with its own entrance', icon: Home },
      { value: 'Townhouse', label: 'Townhouse', description: 'Home in a complex or estate, often with shared walls', icon: Building },
      { value: 'Duplex', label: 'Duplex', description: 'Two-storey unit or a home split into two dwellings', icon: Layers },
    ],
  },
  {
    heading: 'Flats & cottages',
    options: [
      { value: 'Apartment / Flat', label: 'Apartment / Flat', description: 'Unit in a block — incl. bachelor & studio flats', icon: Building2 },
      { value: 'Garden Cottage / Flatlet', label: 'Garden Cottage / Flatlet', description: 'Separate unit on a shared property', icon: Trees },
    ],
  },
  {
    heading: 'Rooms & shared',
    options: [
      { value: 'Room to Rent', label: 'Room to Rent', description: 'Private room in a shared home', icon: DoorOpen },
      { value: 'Student Accommodation', label: 'Student Accommodation', description: 'Housing aimed at students, incl. commune rooms', icon: GraduationCap },
    ],
  },
  {
    heading: 'Other',
    options: [
      { value: 'Commercial Property', label: 'Commercial Property', description: 'Office, retail or industrial space', icon: Store },
    ],
  },
];

const KNOWN_VALUES = groups.flatMap((g) => g.options.map((o) => o.value));

export default function PropertyTypeStep({ control, errors }: PropertyTypeStepProps) {
  // Hoisted (not inside the Controller render) to respect rules-of-hooks.
  const [otherSelected, setOtherSelected] = React.useState(false);

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
        render={({ field }) => {
          // Legacy/custom values (e.g. "Studio" from old listings) select Other.
          const isOtherValue = !!field.value && !KNOWN_VALUES.includes(field.value);
          const otherActive = otherSelected || isOtherValue;

          const selectCard = (value: string) => {
            setOtherSelected(false);
            field.onChange(value);
          };

          return (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.heading} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.heading}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.options.map((type) => {
                      const IconComponent = type.icon;
                      const isSelected = !otherActive && field.value === type.value;
                      return (
                        <Card
                          key={type.value}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
                          }`}
                          onClick={() => selectCard(type.value)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <IconComponent
                              className={`h-8 w-8 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                            />
                            <div className="min-w-0">
                              <h4 className="font-semibold">{type.label}</h4>
                              <p className="text-sm text-muted-foreground">{type.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {group.heading === 'Other' && (
                      <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          otherActive ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => {
                          setOtherSelected(true);
                          if (KNOWN_VALUES.includes(field.value)) field.onChange('');
                        }}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <PenLine
                            className={`h-8 w-8 shrink-0 ${otherActive ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                          <div className="min-w-0">
                            <h4 className="font-semibold">Other</h4>
                            <p className="text-sm text-muted-foreground">Describe your own property type</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ))}

              {otherActive && (
                <div className="max-w-md mx-auto space-y-2">
                  <Input
                    autoFocus
                    maxLength={40}
                    placeholder="e.g. Backpackers, Retirement unit…"
                    value={KNOWN_VALUES.includes(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Give your property type a short name (max 40 characters)
                  </p>
                </div>
              )}
            </div>
          );
        }}
      />

      {errors.property_type && (
        <p className="text-sm text-destructive text-center">{errors.property_type.message}</p>
      )}
    </div>
  );
}
