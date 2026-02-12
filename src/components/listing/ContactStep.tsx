import React from 'react';
import { Control } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, Clock, MessageSquare } from 'lucide-react';

interface ContactStepProps {
  control: Control<any>;
  errors: any;
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
}

const contactTimes = [
  { value: 'morning', label: 'Morning (8AM - 12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM - 5PM)' },
  { value: 'evening', label: 'Evening (5PM - 8PM)' },
  { value: 'anytime', label: 'Anytime' }
];

export default function ContactStep({ control, errors, setValue, watch }: ContactStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Contact Information</h2>
        <p className="text-muted-foreground">How can interested buyers contact you about this property?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact Name *</Label>
          <Input
            id="contact_name"
            placeholder="John Doe"
            {...control.register('contact_name', { 
              required: 'Contact name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' }
            })}
          />
          {errors.contact_name && (
            <p className="text-sm text-destructive">{errors.contact_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="contact_phone"
              placeholder="+27 12 345 6789"
              className="pl-10"
              {...control.register('contact_phone', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^\+?[0-9\s\-\(\)]*$/,
                  message: 'Please enter a valid phone number'
                }
              })}
            />
          </div>
          {errors.contact_phone && (
            <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_email">Email Address *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="contact_email"
            type="email"
            placeholder="john@example.com"
            className="pl-10"
            {...control.register('contact_email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address'
              }
            })}
          />
        </div>
        {errors.contact_email && (
          <p className="text-sm text-destructive">{errors.contact_email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferred_contact_time">Preferred Contact Time *</Label>
        <div className="relative">
          <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Select
            value={watch('preferred_contact_time')}
            onValueChange={(value) => setValue('preferred_contact_time', value)}
          >
            <SelectTrigger className="pl-10">
              <SelectValue placeholder="Select preferred time" />
            </SelectTrigger>
            <SelectContent>
              {contactTimes.map((time) => (
                <SelectItem key={time.value} value={time.value}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.preferred_contact_time && (
          <p className="text-sm text-destructive">{errors.preferred_contact_time.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional_notes">Additional Notes (Optional)</Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="additional_notes"
            placeholder="Any additional information buyers should know? (e.g., best viewing times, special features, etc.)"
            rows={4}
            className="pl-10 resize-none"
            {...control.register('additional_notes', { 
              maxLength: { value: 500, message: 'Notes cannot exceed 500 characters' }
            })}
          />
        </div>
        {errors.additional_notes && (
          <p className="text-sm text-destructive">{errors.additional_notes.message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {watch('additional_notes')?.length || 0}/500 characters
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Privacy Notice:</strong> Your contact information will only be shared with verified users who have expressed interest in your property. 
          You can update these details at any time from your dashboard.
        </p>
      </div>
    </div>
  );
}
