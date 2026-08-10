import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Info } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Alert, AlertDescription } from '@mzanzihomes/ui/components/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mzanzihomes/ui/components/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@mzanzihomes/ui/components/form';
import { Input } from '@mzanzihomes/ui/components/input';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { RadioGroup, RadioGroupItem } from '@mzanzihomes/ui/components/radio-group';
import { Calendar } from '@mzanzihomes/ui/components/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@mzanzihomes/ui/components/popover';
import { cn } from '@mzanzihomes/common/lib/utils';

const preScreeningSchema = z.object({
  moveInDate: z.date({
    required_error: "Please select your desired move-in date",
  }).refine((date) => date > new Date(), {
    message: "Move-in date must be in the future",
  }),
  monthlyIncome: z.string()
    .min(1, "Monthly income is required")
    .transform((val) => parseFloat(val.replace(/[^0-9.]/g, '')))
    .refine((val) => val > 0, "Monthly income must be greater than 0"),
  evictionHistory: z.enum(['no', 'yes', 'first'], {
    required_error: "Please answer this question",
  }),
  collectionsHistory: z.enum(['no', 'yes'], {
    required_error: "Please answer this question",
  }),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type PreScreeningFormData = z.infer<typeof preScreeningSchema>;

// ponytail: reuse across landlords via localStorage — no backend record, just a local convenience cache
const STORAGE_KEY = 'mzanzihomes:prescreening';

interface SavedPreScreening {
  moveInDate: string;
  monthlyIncome: number;
  evictionHistory: 'no' | 'yes' | 'first';
  collectionsHistory: 'no' | 'yes';
}

function loadSavedPreScreening(): SavedPreScreening | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSavedPreScreening(data: SavedPreScreening) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore (private browsing / storage unavailable)
  }
}

interface ViewingPreScreeningFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PreScreeningFormData) => void;
  loading: boolean;
  propertyTitle: string;
}

const evictionHistoryOptions = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'first', label: 'This is my first rental' },
];

const collectionsHistoryOptions = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

// A red asterisk marking a required field. We keep the label text its normal
// colour (via !text-foreground on the FormLabel) so an unfilled field is shown
// by the red star + the message line, not by turning the whole label red.
const RequiredMark = () => (
  <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
);

export default function ViewingPreScreeningForm({
  open,
  onOpenChange,
  onSubmit,
  loading,
  propertyTitle,
}: ViewingPreScreeningFormProps) {
  const [incomeDisplay, setIncomeDisplay] = useState('');
  const [usedSavedData, setUsedSavedData] = useState(false);

  const form = useForm<PreScreeningFormData>({
    resolver: zodResolver(preScreeningSchema),
    defaultValues: {
      message: `Hi! I'm interested in viewing your property "${propertyTitle}". I believe it would be a great fit for my needs. Looking forward to hearing from you!`,
    },
  });

  // Prefill from the last time this tenant filled out pre-screening (e.g. for a different landlord)
  useEffect(() => {
    if (!open) return;
    const saved = loadSavedPreScreening();
    if (!saved) {
      setUsedSavedData(false);
      return;
    }

    const savedMoveInDate = new Date(saved.moveInDate);
    form.reset({
      ...form.getValues(),
      ...(savedMoveInDate > new Date() ? { moveInDate: savedMoveInDate } : {}),
      monthlyIncome: saved.monthlyIncome as any,
      evictionHistory: saved.evictionHistory,
      collectionsHistory: saved.collectionsHistory,
    });
    setIncomeDisplay(`R ${saved.monthlyIncome.toLocaleString()}`);
    setUsedSavedData(true);
  }, [open]);

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      const formatted = `R ${parseInt(value).toLocaleString()}`;
      setIncomeDisplay(formatted);
      form.setValue('monthlyIncome', value as any);
    } else {
      setIncomeDisplay('');
      form.setValue('monthlyIncome', '' as any);
    }
  };

  const handleSubmit = (data: PreScreeningFormData) => {
    saveSavedPreScreening({
      moveInDate: data.moveInDate.toISOString(),
      monthlyIncome: data.monthlyIncome,
      evictionHistory: data.evictionHistory,
      collectionsHistory: data.collectionsHistory,
    });
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Pre-Screening Information</DialogTitle>
          <DialogDescription>
            Help landlords get to know you better by providing some basic information
          </DialogDescription>
        </DialogHeader>

        {usedSavedData && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              We've filled this in using the info you provided last time. Feel free to update anything before sending.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Move-in Date */}
            <FormField
              control={form.control}
              name="moveInDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="!text-foreground">When are you hoping to move in?<RequiredMark /></FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monthly Income */}
            <FormField
              control={form.control}
              name="monthlyIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-foreground">What is your monthly income?<RequiredMark /></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="R 0"
                      value={incomeDisplay}
                      onChange={handleIncomeChange}
                    />
                  </FormControl>
                  <FormDescription>
                    This helps landlords assess affordability
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Eviction History */}
            <FormField
              control={form.control}
              name="evictionHistory"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="!text-foreground">Have you ever been evicted?<RequiredMark /></FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      {evictionHistoryOptions.map((option) => (
                        <FormItem
                          key={option.value}
                          className="flex items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer !text-foreground">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collections History */}
            <FormField
              control={form.control}
              name="collectionsHistory"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="!text-foreground">Have you ever been listed in the last 3 years for non-payment or had an account referred to collections or legal recovery?<RequiredMark /></FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      {collectionsHistoryOptions.map((option) => (
                        <FormItem
                          key={option.value}
                          className="flex items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer !text-foreground">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-foreground">Your message to the landlord<RequiredMark /></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Introduce yourself and express your interest..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    You can edit this message to add more details
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  'Send Viewing Request'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
