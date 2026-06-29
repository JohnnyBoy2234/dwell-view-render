import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { RadioGroup, RadioGroupItem } from '@mzanzihomes/ui/components/radio-group';
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

      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Name *
              </Label>
              <Controller
                name="contact_name"
                control={control}
                rules={{
                  required: 'Contact name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters'
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="John Doe"
                    className={errors.contact_name ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.contact_name && (
                <p className="text-sm text-red-500">{errors.contact_name.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number *
              </Label>
              <Controller
                name="contact_phone"
                control={control}
                rules={{
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[\+]?[0-9\s\-\(\)]+$/,
                    message: 'Please enter a valid phone number'
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="+27 21 123 4567"
                    className={errors.contact_phone ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.contact_phone && (
                <p className="text-sm text-red-500">{errors.contact_phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address *
              </Label>
              <Controller
                name="contact_email"
                control={control}
                rules={{
                  required: 'Email address is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address'
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="email"
                    placeholder="john@example.com"
                    className={errors.contact_email ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.contact_email && (
                <p className="text-sm text-red-500">{errors.contact_email.message}</p>
              )}
            </div>

            {/* Preferred Contact Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preferred Contact Method *</Label>
              <Controller
                name="preferred_contact_method"
                control={control}
                rules={{ required: 'Please select a preferred contact method' }}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone" />
                      <Label htmlFor="phone" className="text-sm">Phone Call</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email" />
                      <Label htmlFor="email" className="text-sm">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="both" />
                      <Label htmlFor="both" className="text-sm">Both</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.preferred_contact_method && (
                <p className="text-sm text-red-500">{errors.preferred_contact_method.message}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 border-blue-200 mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 text-blue-900">🔒 Privacy Notice</h3>
            <p className="text-blue-700">
              Your contact information will only be shared with verified users who are interested in your property. 
              You can update these details at any time from your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ContactStep;
