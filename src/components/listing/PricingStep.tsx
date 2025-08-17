import React from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign } from 'lucide-react';
import { ListingFormData } from '@/pages/ListProperty';

interface PricingStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  setValue: UseFormSetValue<ListingFormData>;
}

export default function PricingStep({ control, errors }: PricingStepProps) {
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
              <DollarSign className="h-5 w-5" />
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
                  min: { value: 1000, message: 'Minimum rent is R1,000' },
                  max: { value: 100000, message: 'Maximum rent is R100,000' }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="1000"
                    max="100000"
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
                  className="text-base h-12"
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