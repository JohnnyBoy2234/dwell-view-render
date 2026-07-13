import * as React from 'react';
import { Control, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Label } from '@mzanzihomes/ui/components/label';
import { Button } from '@mzanzihomes/ui/components/button';
import { AddressAutocomplete } from '@mzanzihomes/ui/components/address-autocomplete';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mzanzihomes/ui/components/select';
import { MapPin, FileText, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mzanzihomes/ui/components/dialog';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { ListingFormData } from '../types';
import { SA_PROVINCES, isValidPostalCode, descriptionWarning, DESCRIPTION_MIN } from '../validation';

interface LocationStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  watch?: UseFormWatch<ListingFormData>;
  setValue?: UseFormSetValue<ListingFormData>;
  structuredAddress?: boolean;
}

// Google's province names can differ from our canonical list in case or
// hyphenation (e.g. "Kwazulu-Natal" vs "KwaZulu-Natal"). Match case- and
// punctuation-insensitively and return the canonical entry, or '' if no match.
const normalizeProvince = (raw: string): string => {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!key) return '';
  return SA_PROVINCES.find((p) => p.toLowerCase().replace(/[^a-z0-9]/g, '') === key) || '';
};

// Google Places returns address_components; map them to our fields.
const parsePlace = (place: any) => {
  const comps: any[] = place?.address_components || [];
  const get = (type: string) => comps.find((c) => c.types?.includes(type))?.long_name || '';
  const streetNumber = get('street_number');
  const route = get('route');
  return {
    street_address: [streetNumber, route].filter(Boolean).join(' '),
    suburb: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
    city: get('locality') || get('administrative_area_level_2'),
    province: normalizeProvince(get('administrative_area_level_1')),
    postal_code: get('postal_code'),
  };
};

export default function LocationStep({ control, errors, watch, setValue, structuredAddress }: LocationStepProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = React.useState(false);
  // The "Write with AI" mini-interview dialog.
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiFeatures, setAiFeatures] = React.useState('');
  const [aiArea, setAiArea] = React.useState('');

  const handleGenerate = async (keyFeatures?: string) => {
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
          key_features: keyFeatures ?? v.ai_key_features,
        },
      });
      if (error) throw error;
      if (data?.description) {
        setValue('description', data.description, { shouldValidate: true, shouldDirty: true });
        setAiOpen(false);
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
        {structuredAddress ? (
          /* Address */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Search your address
              </Label>
              <AddressAutocomplete
                value={watch?.('location') || ''}
                onChange={(v) => setValue?.('location', v, { shouldDirty: true })}
                onPlaceSelect={(place) => {
                  const parsed = parsePlace(place);
                  (Object.entries(parsed) as [any, string][]).forEach(([k, v]) => {
                    if (v) setValue?.(k, v, { shouldValidate: true, shouldDirty: true });
                  });
                }}
                placeholder="Start typing your address…"
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                Pick your address and we'll fill in the fields below — you can correct any of them.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="street_address">Street address (optional)</Label>
                <Controller
                  name="street_address"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value || ''} id="street_address" placeholder="12 Protea Road" className="text-base" />
                  )}
                />
                <p className="text-xs text-muted-foreground">Not shown publicly until you choose to share it.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb *</Label>
                <Controller
                  name="suburb"
                  control={control}
                  rules={{ required: 'Suburb is required' }}
                  render={({ field }) => (
                    <Input {...field} value={field.value || ''} id="suburb" placeholder="Sandton" className="text-base" />
                  )}
                />
                {errors.suburb && <p className="text-sm text-destructive">{errors.suburb.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Controller
                  name="city"
                  control={control}
                  rules={{ required: 'City is required' }}
                  render={({ field }) => (
                    <Input {...field} value={field.value || ''} id="city" placeholder="Johannesburg" className="text-base" />
                  )}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Province *</Label>
                <Controller
                  name="province"
                  control={control}
                  rules={{ required: 'Please select a province' }}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {SA_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.province && <p className="text-sm text-destructive">{errors.province.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal code *</Label>
                <Controller
                  name="postal_code"
                  control={control}
                  rules={{
                    required: 'Postal code is required',
                    validate: (v) => isValidPostalCode(v || '') || 'Enter a 4-digit postal code',
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ''}
                      id="postal_code"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="2196"
                      className="text-base"
                    />
                  )}
                />
                {errors.postal_code && <p className="text-sm text-destructive">{errors.postal_code.message}</p>}
              </div>
            </div>
          </div>
        ) : (
          /* Location */
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
        )}


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
                onClick={() => {
                  setAiFeatures((watch('ai_key_features') as string) || '');
                  setAiOpen(true);
                }}
                disabled={generating}
                className="h-8 text-xs shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Write with AI
              </Button>
            )}
          </div>
          <Controller
            name="description"
            control={control}
            rules={{
              required: 'Description is required',
              minLength: { value: DESCRIPTION_MIN, message: `Description should be at least ${DESCRIPTION_MIN} characters` }
            }}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Write your own description here, or tap Write with AI…"
                rows={6}
                className="text-base resize-none"
              />
            )}
          />
          {(() => {
            const desc = watch?.('description') || '';
            const warning = descriptionWarning(desc);
            return (
              <div className="flex items-start justify-between gap-2">
                <div>
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                  {!errors.description && warning && (
                    <p className="text-sm text-amber-600">{warning}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {desc.trim().length} characters{desc.trim().length < DESCRIPTION_MIN ? ` (min ${DESCRIPTION_MIN})` : ''}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Write-with-AI mini interview: two quick questions, then generate. */}
      <Dialog open={aiOpen} onOpenChange={(open) => { if (!generating) setAiOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Write with AI
            </DialogTitle>
            <DialogDescription>
              Answer two quick questions and the AI writes your description. Both are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-features">What makes your place special?</Label>
              <Textarea
                id="ai-features"
                value={aiFeatures}
                onChange={(e) => setAiFeatures(e.target.value)}
                placeholder="Pool, mountain views, renovated kitchen, prepaid electricity, fibre…"
                rows={3}
                className="text-base resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-area">Anything nearby worth mentioning?</Label>
              <Input
                id="ai-area"
                value={aiArea}
                onChange={(e) => setAiArea(e.target.value)}
                placeholder="Close to schools, Gautrain, shopping centre…"
                className="text-base"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={generating} onClick={() => setAiOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={generating}
              onClick={() => {
                const combined = [
                  aiFeatures.trim(),
                  aiArea.trim() ? `Nearby/area: ${aiArea.trim()}` : '',
                ].filter(Boolean).join('; ');
                setValue?.('ai_key_features', combined, { shouldDirty: true });
                void handleGenerate(combined);
              }}
            >
              {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {generating ? 'Writing…' : 'Write description'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}