import * as React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Label } from '@mzanzihomes/ui/components/label';
import { AddressAutocomplete } from '@mzanzihomes/ui/components/address-autocomplete';
import { MapPin, FileText } from 'lucide-react';
import { ListingFormData } from '@/pages/ListProperty';

interface LocationStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
}

export default function LocationStep({ control, errors }: LocationStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Tell us about your property</h2>
        <p className="text-muted-foreground">Help tenants find and understand your property</p>
      </div>

      <div className="space-y-6">
        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Property Location *
          </Label>
          <Controller
            name="location"
            control={control}
            rules={{ required: 'Location is required' }}
            render={({ field }) => (
              <AddressAutocomplete
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="e.g., Sandton, Johannesburg, Gauteng"
                className="text-base"
              />
            )}
          />
          {errors.location && (
            <p className="text-sm text-destructive">{errors.location.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Include the suburb, city, and province for better visibility
          </p>
        </div>


        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Property Description *
          </Label>
          <Controller
            name="description"
            control={control}
            rules={{ 
              required: 'Description is required',
              minLength: { value: 50, message: 'Description should be at least 50 characters' }
            }}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Describe your property in detail. Include information about the layout, features, neighborhood, nearby amenities, and what makes it special..."
                rows={6}
                className="text-base resize-none"
              />
            )}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Provide detailed information about the property, its features, and the surrounding area. Mention nearby schools, shopping centers, transport links, etc.
          </p>
        </div>
      </div>
    </div>
  );
}