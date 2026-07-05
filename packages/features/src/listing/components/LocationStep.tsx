import * as React from 'react';
import { Control, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Label } from '@mzanzihomes/ui/components/label';
import { Button } from '@mzanzihomes/ui/components/button';
import { AddressAutocomplete } from '@mzanzihomes/ui/components/address-autocomplete';
import { MapPin, FileText, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { ListingFormData } from '../types';

interface LocationStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  watch?: UseFormWatch<ListingFormData>;
  setValue?: UseFormSetValue<ListingFormData>;
}

export default function LocationStep({ control, errors, watch, setValue }: LocationStepProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = React.useState(false);

  const handleGenerate = async () => {
    if (!watch || !setValue) return;
    const v: any = watch();
    if (!v.property_type && !v.location) {
      toast({ title: 'Add a type or location first', description: 'Pick a property type and location so the AI can write a good description.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-property-description', {
        body: {
          property_type: v.property_type,
          location: v.location,
          bedrooms: v.bedrooms,
          bathrooms: v.bathrooms,
          parking_spaces: v.parking_spaces,
          furnished: v.furnished,
          pets_allowed: v.pets_allowed,
          amenities: v.amenities,
          price: v.price,
          listing_type: v.listing_type,
        },
      });
      if (error) throw error;
      if (data?.description) {
        setValue('description', data.description, { shouldValidate: true, shouldDirty: true });
        toast({ title: 'Description generated ✨', description: 'Feel free to tweak it before publishing.' });
      } else {
        throw new Error(data?.error || 'No description was returned.');
      }
    } catch (e: any) {
      toast({ title: 'Could not generate', description: e?.message || 'Please try again in a moment.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Property Description *
            </Label>
            {watch && setValue && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                className="h-8 text-xs shrink-0"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                {generating ? 'Writing…' : 'Write with AI'}
              </Button>
            )}
          </div>
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