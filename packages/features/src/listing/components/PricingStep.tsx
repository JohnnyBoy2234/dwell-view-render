import * as React from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Calendar } from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { ListingFormData } from '../types';
import { PRICE_MIN, PRICE_MAX, priceWarning } from '../validation';

interface PricingStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  setValue: UseFormSetValue<ListingFormData>;
  watch?: UseFormWatch<ListingFormData>;
}

export default function PricingStep({ control, errors, watch }: PricingStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Set your price & availability</h2>
        <p className="text-muted-foreground">Price your property competitively to attract tenants</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Monthly Rent */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label htmlFor="price" className="flex items-center gap-2 text-lg font-semibold">
              <span className="w-5 h-5 flex items-center justify-center text-lg font-bold text-primary">R</span>
              Monthly Rent *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                R
              </span>
              <Controller
                name="price"
                control={control}
                rules={{
                  required: 'Monthly rent is required',
                  min: { value: PRICE_MIN, message: `Minimum rent is R${PRICE_MIN.toLocaleString()}` },
                  max: { value: PRICE_MAX, message: `Maximum rent is R${PRICE_MAX.toLocaleString()}` },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    placeholder="12,000"
                    className="pl-8 text-lg h-12"
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                )}
              />
            </div>
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            )}
            {!errors.price && watch && priceWarning(watch('price')) && (
              <p className="text-sm text-amber-600">{priceWarning(watch('price'))}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Research similar properties in your area to set a competitive price
            </p>
          </div>
        </Card>

        {/* Available From */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label htmlFor="available_from" className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5" />
              Available From
            </Label>
            <Controller
              name="available_from"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                  className="text-sm sm:text-base h-12 pr-2"
                  min={new Date().toISOString().split('T')[0]}
                />
              )}
            />
            <p className="text-sm text-muted-foreground">
              When can tenants move in? Leave blank if available immediately
            </p>
          </div>
        </Card>

        {/* Pricing Tips */}
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 text-accent-foreground">💡 Pricing Tips</h3>
            <ul className="space-y-2 text-sm text-accent-foreground/80">
              <li>• Research similar properties in your area</li>
              <li>• Consider nearby amenities and transport links</li>
              <li>• Factor in property condition and furnishing</li>
              <li>• Be flexible to attract quality tenants quickly</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}