import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, User } from 'lucide-react';
import { SaleListingFormData } from '@/pages/ListSale';

interface ContactStepProps {
  control: Control<SaleListingFormData>;
  errors: FieldErrors<SaleListingFormData>;
}

export function ContactStep({ control, errors }: ContactStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Phone className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
        <p className="text-muted-foreground">
          Add your contact details so potential buyers can reach you about this property
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          control={control}
          name="contact_name"
          rules={{
            required: 'Contact name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters'
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Name *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  className={errors.contact_name ? 'border-red-500' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="contact_phone"
          rules={{
            required: 'Phone number is required',
            pattern: {
              value: /^[\+]?[0-9\s\-\(\)]+$/,
              message: 'Please enter a valid phone number'
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="+27 21 123 4567"
                  {...field}
                  className={errors.contact_phone ? 'border-red-500' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="contact_email"
        rules={{
          required: 'Email address is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Please enter a valid email address'
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="john@example.com"
                {...field}
                className={errors.contact_email ? 'border-red-500' : ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="preferred_contact_method"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred Contact Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-3"
              >
                <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="phone" id="phone" />
                      <Label htmlFor="phone" className="flex items-center gap-2 cursor-pointer">
                        <Phone className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Phone Call</div>
                          <div className="text-sm text-muted-foreground">I prefer to be contacted by phone</div>
                        </div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="email" id="email" />
                      <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                        <Mail className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Email</div>
                          <div className="text-sm text-muted-foreground">I prefer to be contacted by email</div>
                        </div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="both" id="both" />
                      <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer">
                        <div className="flex gap-2">
                          <Phone className="h-4 w-4" />
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">Either</div>
                          <div className="text-sm text-muted-foreground">I'm available for both phone and email</div>
                        </div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-600 text-xs font-bold">i</span>
          </div>
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Privacy Notice</p>
            <p className="text-blue-700">
              Your contact information will only be shared with verified users who are interested in your property. 
              You can update these details at any time from your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
