import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Calendar } from '@mzanzihomes/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@mzanzihomes/ui/components/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { cn } from '@mzanzihomes/common/lib/utils';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

interface AddViewingSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  propertyId: string;
  tenantId: string;
  propertyTitle?: string;
  onSuccess?: () => void;
}

export function AddViewingSlotModal({
  open,
  onOpenChange,
  conversationId,
  propertyId,
  tenantId,
  propertyTitle = 'Property',
  onSuccess
}: AddViewingSlotModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('20');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Generate time slots from 8 AM to 6 PM
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute of [0, 30]) {
      if (hour === 18 && minute === 30) break; // Stop at 6:00 PM
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select both date and time for the viewing.",
      });
      return;
    }

    // Validate required identifiers
    if (!conversationId || !propertyId || !tenantId) {
      toast({
        variant: "destructive",
        title: "Missing context",
        description: "Conversation, property, or tenant information is missing.",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Combine date and time, treating as Africa/Johannesburg time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const localDateTime = new Date(selectedDate);
      localDateTime.setHours(hours, minutes, 0, 0);
      
      // Convert to UTC for storage
      const utcDateTime = fromZonedTime(localDateTime, 'Africa/Johannesburg');
      
      // Validate the time is in the future
      const now = new Date();
      const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      if (utcDateTime <= minTime) {
        toast({
          variant: "destructive",
          title: "Invalid time",
          description: "Viewing time must be at least 30 minutes in the future.",
        });
        return;
      }

      // Ensure authenticated call to Edge Function
      const { data: sessionResult } = await supabase.auth.getSession();
      const accessToken = sessionResult.session?.access_token;
      if (!accessToken) {
        throw new Error('You need to be signed in to create a viewing.');
      }

      const { data, error } = await supabase.functions.invoke('create-viewing-proposal', {
        body: {
          conversationId,
          propertyId,
          tenantId,
          startAtISO: utcDateTime.toISOString(),
          durationMinutes: parseInt(duration),
          notes: notes.trim() || undefined
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create viewing request');
      }

      // Edge Function may return { error: string } in data on failure with 200; handle that too
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }

      toast({
        title: "Viewing request sent",
        description: `Tenant will be notified about the viewing on ${format(localDateTime, 'PPP')} at ${selectedTime}.`,
      });

      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
      setDuration('20');
      setNotes('');
      
      onSuccess?.();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error creating viewing request:', error);
      toast({
        variant: "destructive",
        title: "Error creating viewing request",
        description: (error?.message as string) || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setDuration('20');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Create Viewing Request</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Propose a viewing time for <strong>{propertyTitle}</strong>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => 
                    date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Select Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time">
                  {selectedTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedTime} SAST
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time} SAST
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific instructions or information..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="flex-1"
              disabled={loading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedDate || !selectedTime}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}