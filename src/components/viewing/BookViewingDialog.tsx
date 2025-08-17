import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Check, Calendar, Clock, Edit, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewingBooking } from "@/hooks/useViewingBooking";

interface BookViewingDialogProps {
  propertyId: string;
  landlordId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookViewingDialog({ propertyId, landlordId, open, onOpenChange }: BookViewingDialogProps) {
  const { user } = useAuth();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [booking, setBooking] = useState(false);
  
  const {
    loading,
    activeBooking,
    availableSlots,
    bookSlot,
    cancelBooking,
    updateBooking
  } = useViewingBooking(propertyId, landlordId);

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlotId(selectedSlotId === slotId ? null : slotId);
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedSlotId) return;
    
    setBooking(true);
    try {
      if (isUpdating && activeBooking) {
        const success = await updateBooking(selectedSlotId);
        if (success) {
          setIsUpdating(false);
          setSelectedSlotId(null);
          onOpenChange(false);
        }
      } else {
        const success = await bookSlot(selectedSlotId);
        if (success) {
          setSelectedSlotId(null);
          onOpenChange(false);
        }
      }
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    setBooking(true);
    try {
      const success = await cancelBooking();
      if (success) {
        setIsUpdating(false);
        setSelectedSlotId(null);
        onOpenChange(false);
      }
    } finally {
      setBooking(false);
    }
  };

  const handleUpdateBooking = () => {
    setIsUpdating(true);
    setSelectedSlotId(null);
  };

  const selectedSlot = availableSlots.find(slot => slot.id === selectedSlotId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {activeBooking && !isUpdating ? "Manage Your Viewing" : 
             isUpdating ? "Reschedule Viewing" : "Book a Viewing"}
          </DialogTitle>
          <DialogDescription>
            {activeBooking && !isUpdating ? 
              "You have a scheduled viewing for this property" :
              isUpdating ? 
                "Select a new time for your viewing" :
                "Select your preferred viewing time from the available slots below"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Booking Display */}
          {activeBooking && !isUpdating && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Scheduled Viewing</span>
              </div>
              <div className="space-y-1">
                <div className="font-medium">
                  {format(new Date(activeBooking.start_time), "EEEE, MMMM d")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(activeBooking.start_time), "h:mm a")} - {format(new Date(activeBooking.end_time), "h:mm a")}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateBooking}
                  disabled={booking}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Reschedule
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelBooking}
                  disabled={booking}
                  className="flex-1"
                >
                  {booking ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Available Slots */}
          {(isUpdating || !activeBooking) && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-sm text-muted-foreground">Loading available times...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No viewing times are currently available. Please check back later or contact the landlord directly.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotSelect(slot.id)}
                        className={cn(
                          "w-full text-left rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md",
                          selectedSlotId === slot.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                        )}
                        disabled={booking}
                        role="radio"
                        aria-checked={selectedSlotId === slot.id}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSlotSelect(slot.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">
                              {format(new Date(slot.start_time), "EEEE, MMMM d")}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {format(new Date(slot.start_time), "h:mm a")} - {format(new Date(slot.end_time), "h:mm a")}
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              selectedSlotId === slot.id
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            )}>
                              {selectedSlotId === slot.id && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Selection Summary & Confirm Button */}
                  <div className="border-t pt-4 space-y-4">
                    {selectedSlotId && selectedSlot ? (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-sm text-muted-foreground mb-1">
                          {isUpdating ? "New viewing time:" : "Selected viewing time:"}
                        </div>
                        <div className="font-medium">
                          {format(new Date(selectedSlot.start_time), "EEEE, MMMM d")} at {format(new Date(selectedSlot.start_time), "h:mm a")}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        Please select a viewing time above
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {isUpdating && (
                        <Button 
                          variant="outline"
                          onClick={() => setIsUpdating(false)}
                          disabled={booking}
                          className="flex-1"
                        >
                          Back to Current Booking
                        </Button>
                      )}
                      <Button 
                        onClick={handleConfirmBooking}
                        disabled={!selectedSlotId || booking}
                        className="flex-1"
                        size="lg"
                      >
                        {booking ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {isUpdating ? "Rescheduling..." : "Booking..."}
                          </>
                        ) : selectedSlotId ? (
                          isUpdating ? "Confirm Reschedule" : "Confirm Booking"
                        ) : (
                          "Select a Time Slot"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
