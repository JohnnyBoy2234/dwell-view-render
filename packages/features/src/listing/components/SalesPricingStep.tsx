import * as React from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Tag } from 'lucide-react';
import { SaleListingFormData } from '../types';

interface SalesPricingStepProps {
  control: Control<SaleListingFormData>;
  errors: FieldErrors<SaleListingFormData>;
  setValue: UseFormSetValue<SaleListingFormData>;
}

export default function SalesPricingStep({ control, errors }: SalesPricingStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Set your sale price</h2>
        <p className="text-muted-foreground">Price your property competitively to attract buyers</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Sale Price */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label htmlFor="price" className="flex items-center gap-2 text-lg font-semibold">
              <Tag className="h-5 w-5" />
              Sale Price *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                R
              </span>
              <Controller
                name="price"
                control={control}
                rules={{ 
                  required: 'Sale price is required',
                  min: { value: 50000, message: 'Minimum sale price is R50,000' },
                  max: { value: 50000000, message: 'Maximum sale price is R50,000,000' }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="50000"
                    max="50000000"
                    placeholder="1,250,000"
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
              <Tag className="h-5 w-5" />
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
              When can the buyer take ownership? Leave blank if available immediately
            </p>
          </div>
        </Card>

        {/* Pricing Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 text-blue-900">💡 Sales Pricing Tips</h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li>• Research recent sales of similar properties in your area</li>
              <li>• Consider property condition, age, and renovations</li>
              <li>• Factor in location, amenities, and school districts</li>
              <li>• Be prepared to negotiate with potential buyers</li>
              <li>• Consider getting a professional valuation</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
