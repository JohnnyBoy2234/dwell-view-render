import { Controller, Control, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Phone, Mail } from 'lucide-react';
import type { ListingFormData } from '@/pages/ListProperty';

interface ContactStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
}

export default function ContactStep({ control, errors }: ContactStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Add your contact details so buyers can reach you directly.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact_phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Mobile Number *
          </Label>
          <Controller
            name="contact_phone"
            control={control}
            rules={{ required: 'Mobile number is required for sale listings' }}
            render={({ field }) => (
              <Input
                {...field}
                id="contact_phone"
                type="tel"
                placeholder="e.g. 082 123 4567"
                value={field.value || ''}
              />
            )}
          />
          {errors.contact_phone && (
            <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address *
          </Label>
          <Controller
            name="contact_email"
            control={control}
            rules={{
              required: 'Email is required for sale listings',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address',
              },
            }}
            render={({ field }) => (
              <Input
                {...field}
                id="contact_email"
                type="email"
                placeholder="e.g. you@example.com"
                value={field.value || ''}
              />
            )}
          />
          {errors.contact_email && (
            <p className="text-sm text-destructive">{errors.contact_email.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
