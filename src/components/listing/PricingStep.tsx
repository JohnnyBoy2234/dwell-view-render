import * as React from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from 'lucide-react';
import { ListingFormData } from '@/pages/ListProperty';

interface PricingStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  setValue: UseFormSetValue<ListingFormData>;
  listingType?: 'rent' | 'sale';
}

export default function PricingStep({ control, errors, setValue, listingType }: PricingStepProps) {
  const isSale = listingType === 'sale';

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">
          {isSale ? 'Set your sale price & details' : 'Set your price & availability'}
        </h2>
        <p className="text-muted-foreground">
          {isSale ? 'Price your property for a successful sale' : 'Price your property competitively to attract tenants'}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {isSale ? (
          <>
            {/* Sale Price */}
            <Card className="p-6">
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-lg font-semibold">
                  <span className="w-5 h-5 flex items-center justify-center text-lg font-bold text-primary">R</span>
                  Sale Price *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R</span>
                  <Controller
                    name="sale_price"
                    control={control}
                    rules={{
                      required: 'Sale price is required',
                      min: { value: 100000, message: 'Minimum sale price is R100,000' }
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        min="100000"
                        placeholder="1,500,000"
                        className="pl-8 text-lg h-12"
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    )}
                  />
                </div>
                {errors.sale_price && (
                  <p className="text-sm text-destructive">{errors.sale_price.message}</p>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Controller
                    name="price_negotiable"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="price_negotiable"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                      />
                    )}
                  />
                  <Label htmlFor="price_negotiable">Price negotiable</Label>
                </div>
              </div>
            </Card>

            {/* Monthly Costs */}
            <Card className="p-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Monthly Costs (optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="levy_amount">Levy (R)</Label>
                    <Controller
                      name="levy_amount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="2,500"
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rates_taxes">Rates & Taxes (R)</Label>
                    <Controller
                      name="rates_taxes"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="1,200"
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Property Size & Transfer */}
            <Card className="p-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Additional Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="erf_size">ERF Size (m²)</Label>
                    <Controller
                      name="erf_size"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="500"
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer_duty_estimate">Transfer Duty Est. (R)</Label>
                    <Controller
                      name="transfer_duty_estimate"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="50,000"
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation_date">Occupation Date</Label>
                  <Controller
                    name="occupation_date"
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
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* Monthly Rent */}
            <Card className="p-6">
              <div className="space-y-4">
                <Label htmlFor="price" className="flex items-center gap-2 text-lg font-semibold">
                  <span className="w-5 h-5 flex items-center justify-center text-lg font-bold text-primary">R</span>
                  Monthly Rent *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R</span>
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
          </>
        )}

        {/* Pricing Tips */}
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 text-accent-foreground">
              💡 {isSale ? 'Selling Tips' : 'Pricing Tips'}
            </h3>
            <ul className="space-y-2 text-sm text-accent-foreground/80">
              {isSale ? (
                <>
                  <li>• Get a professional valuation for accurate pricing</li>
                  <li>• Research recent sales in your area</li>
                  <li>• Consider market conditions and demand</li>
                  <li>• Factor in property upgrades and condition</li>
                </>
              ) : (
                <>
                  <li>• Research similar properties in your area</li>
                  <li>• Consider nearby amenities and transport links</li>
                  <li>• Factor in property condition and furnishing</li>
                  <li>• Be flexible to attract quality tenants quickly</li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
