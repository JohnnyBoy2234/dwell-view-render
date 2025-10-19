import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar, DollarSign, Home, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const preScreeningSchema = z.object({
  moveInDate: z.date({
    required_error: "Please select your desired move-in date",
  }),
  monthlyIncome: z.string()
    .min(1, "Please enter your monthly income")
    .regex(/^\d+$/, "Please enter a valid number"),
  rentalHistory: z.enum([
    'clean',
    'late',
    'evicted',
    'first_time'
  ], {
    required_error: "Please select your rental history",
  }),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type PreScreeningFormData = z.infer<typeof preScreeningSchema>;

interface ViewingPreScreeningFormProps {
  propertyAddress: string;
  onSubmit: (data: PreScreeningFormData) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function ViewingPreScreeningForm({
  propertyAddress,
  onSubmit,
  onCancel,
  loading
}: ViewingPreScreeningFormProps) {
  const [date, setDate] = useState<Date>();
  
  const defaultMessage = `Hi! I'm interested in viewing your property at ${propertyAddress}. I believe it would be a great fit for my needs. Looking forward to hearing from you!`;
  
  const form = useForm<PreScreeningFormData>({
    resolver: zodResolver(preScreeningSchema),
    defaultValues: {
      message: defaultMessage,
    },
  });

  const handleSubmit = (data: PreScreeningFormData) => {
    onSubmit(data);
  };

  const rentalHistoryOptions = [
    { value: 'clean', label: 'No, I have a clean rental history' },
    { value: 'late', label: 'Yes, I have been late on rent before' },
    { value: 'evicted', label: 'Yes, I have been evicted before' },
    { value: 'first_time', label: 'This is my first rental' },
  ];

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* Move-in Date */}
        <div className="space-y-2">
          <Label htmlFor="moveInDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            When are you hoping to move in?
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  form.setValue('moveInDate', newDate as Date);
                }}
                disabled={(date) => date < new Date()}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.moveInDate && (
            <p className="text-sm text-destructive">
              {form.formState.errors.moveInDate.message}
            </p>
          )}
        </div>

        {/* Monthly Income */}
        <div className="space-y-2">
          <Label htmlFor="monthlyIncome" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            What is your monthly income?
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R
            </span>
            <Input
              {...form.register('monthlyIncome')}
              type="text"
              placeholder="15000"
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Your income helps landlords assess affordability
          </p>
          {form.formState.errors.monthlyIncome && (
            <p className="text-sm text-destructive">
              {form.formState.errors.monthlyIncome.message}
            </p>
          )}
        </div>

        {/* Rental History */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Have you ever been late on rent or been evicted?
          </Label>
          <RadioGroup
            onValueChange={(value) => form.setValue('rentalHistory', value as any)}
            className="space-y-2"
          >
            {rentalHistoryOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label
                  htmlFor={option.value}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {form.formState.errors.rentalHistory && (
            <p className="text-sm text-destructive">
              {form.formState.errors.rentalHistory.message}
            </p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Your message</Label>
          <Textarea
            {...form.register('message')}
            placeholder="Write your message to the landlord..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Feel free to edit the message above to add more details
          </p>
          {form.formState.errors.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.message.message}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Request
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
