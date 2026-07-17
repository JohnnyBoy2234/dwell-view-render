import * as React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch, UseFormTrigger } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Switch } from '@mzanzihomes/ui/components/switch';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Bed, Bath, Car, Ruler, Sofa, Heart } from 'lucide-react';
import { ListingFormData } from '../types';
import { MAX_ROOMS, needsBathroomConfirm } from '../validation';

interface DetailsStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  setValue: UseFormSetValue<ListingFormData>;
  watch: UseFormWatch<ListingFormData>;
  trigger?: UseFormTrigger<ListingFormData>;
}

const amenitiesList = [
  'Swimming Pool', 'Garden', 'Security', 'Gym/Fitness Center', 'Braai Area',
  'Air Conditioning', 'WiFi', 'DSTV', 'Backup Power', 'Water Tank',
  'Fiber Internet', 'Balcony', 'Parking Bay', 'Storage Space'
];

export default function DetailsStep({ control, errors, setValue, watch, trigger }: DetailsStepProps) {
  const selectedAmenities = watch('amenities') || [];
  const furnished = watch('furnished');
  const petsAllowed = watch('pets_allowed');

  const toggleAmenity = (amenity: string) => {
    const currentAmenities = selectedAmenities;
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    setValue('amenities', newAmenities);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Property specifications</h2>
        <p className="text-muted-foreground">Provide details about your property's features</p>
      </div>

      {/* Basic Specs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bedrooms" className="flex items-center gap-2">
            <Bed className="h-4 w-4" />
            Bedrooms *
          </Label>
          <Controller
            name="bedrooms"
            control={control}
            rules={{
              required: 'Bedrooms is required',
              min: { value: 0, message: 'Minimum 0 bedrooms' },
              max: { value: MAX_ROOMS, message: `Maximum ${MAX_ROOMS} bedrooms` },
              validate: (v) => {
                // Runtime value can be '' (empty input) even though the type says number.
                const raw = v as number | '' | null | undefined;
                if (raw === '' || raw == null) return true;
                return Number.isInteger(Number(raw)) || 'Whole numbers only';
              },
            }}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="0"
                placeholder="2"
                className="text-base"
                onChange={(e) => {
                  field.onChange(e.target.value === '' ? '' : Number(e.target.value));
                  setValue('bathrooms_confirmed', false);
                  if (errors.bathrooms) trigger?.('bathrooms');
                }}
              />
            )}
          />
          {errors.bedrooms && (
            <p className="text-xs text-destructive">{errors.bedrooms.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bathrooms" className="flex items-center gap-2">
            <Bath className="h-4 w-4" />
            Bathrooms *
          </Label>
          <Controller
            name="bathrooms"
            control={control}
            rules={{
              required: 'Bathrooms is required',
              min: { value: 1, message: 'Minimum 1 bathroom' },
              max: { value: MAX_ROOMS, message: `Maximum ${MAX_ROOMS} bathrooms` },
              validate: (v) => {
                // Runtime value can be '' (empty input) even though the type says number.
                const raw = v as number | '' | null | undefined;
                if (raw === '' || raw == null) return true;
                if (!Number.isInteger(Number(raw))) return 'Whole numbers only';
                if (needsBathroomConfirm(watch('bedrooms'), Number(raw)) && !watch('bathrooms_confirmed')) {
                  return 'Please tick the confirmation below';
                }
                return true;
              },
            }}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="1"
                placeholder="1"
                className="text-base"
                onChange={(e) => {
                  field.onChange(e.target.value === '' ? '' : Number(e.target.value));
                  setValue('bathrooms_confirmed', false);
                }}
              />
            )}
          />
          {errors.bathrooms && (
            <p className="text-xs text-destructive">{errors.bathrooms.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="parking_spaces" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Parking
          </Label>
          <Controller
            name="parking_spaces"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="0"
                placeholder="1"
                className="text-base"
                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="size_sqm" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Size (sqm)
          </Label>
          <Controller
            name="size_sqm"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="1"
                placeholder="85"
                className="text-base"
                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              />
            )}
          />
        </div>
      </div>

      {needsBathroomConfirm(watch('bedrooms'), watch('bathrooms')) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 flex items-start gap-3">
          <Checkbox
            id="bathrooms_confirmed"
            checked={!!watch('bathrooms_confirmed')}
            onCheckedChange={(v) => {
              setValue('bathrooms_confirmed', !!v, { shouldValidate: true });
              if (errors.bathrooms) trigger?.('bathrooms');
            }}
            className="mt-0.5"
          />
          <Label htmlFor="bathrooms_confirmed" className="text-sm text-amber-800 dark:text-amber-200 font-normal cursor-pointer">
            {watch('bathrooms')} bathrooms for {watch('bedrooms')} bedroom{Number(watch('bedrooms')) === 1 ? '' : 's'} — is that right? Tick to confirm.
          </Label>
        </div>
      )}

      {/* Property Features */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Property Features</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Sofa className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Furnished</p>
                <p className="text-sm text-muted-foreground">Property comes with furniture</p>
              </div>
            </div>
            <Controller
              name="furnished"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Pet Friendly</p>
                <p className="text-sm text-muted-foreground">Pets are allowed</p>
              </div>
            </div>
            <Controller
              name="pets_allowed"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Amenities</h3>
        <p className="text-sm text-muted-foreground">Select all available amenities</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {amenitiesList.map(amenity => (
            <Badge
              key={amenity}
              variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
              className="cursor-pointer justify-center p-3 text-center hover:bg-primary/10 transition-colors"
              onClick={() => toggleAmenity(amenity)}
            >
              {amenity}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}