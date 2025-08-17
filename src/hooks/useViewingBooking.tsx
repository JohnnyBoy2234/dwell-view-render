import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ActiveBooking {
  has_booking: boolean;
  slot_id: string;
  start_time: string;
  end_time: string;
}

export interface ViewingSlot {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

export const useViewingBooking = (propertyId: string, landlordId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<ViewingSlot[]>([]);

  useEffect(() => {
    if (user && propertyId) {
      checkActiveBooking();
      fetchAvailableSlots();
    }
  }, [user, propertyId]);

  const checkActiveBooking = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('has_active_booking', {
        property_uuid: propertyId,
        tenant_uuid: user.id
      });

      if (error) throw error;
      
      if (data && data.length > 0 && data[0].has_booking) {
        setActiveBooking(data[0]);
      } else {
        setActiveBooking(null);
      }
    } catch (error) {
      console.error('Error checking active booking:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viewing_slots')
        .select('id, start_time, end_time, status')
        .eq('property_id', propertyId)
        .eq('status', 'available')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        title: "Error",
        description: "Failed to load viewing slots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const bookSlot = async (slotId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('viewing_slots')
        .update({ 
          status: 'booked', 
          booked_by_tenant_id: user.id 
        })
        .eq('id', slotId)
        .eq('status', 'available');

      if (error) throw error;

      // Send notification
      await supabase.functions.invoke('notify-viewing-booked', {
        body: {
          property_id: propertyId,
          landlord_id: landlordId,
          tenant_id: user.id,
          slot_id: slotId,
          action: 'booked'
        }
      });

      toast({
        title: "Viewing booked successfully!",
        description: "Your appointment has been confirmed. You'll receive an email confirmation."
      });

      await checkActiveBooking();
      await fetchAvailableSlots();
      return true;
    } catch (error) {
      console.error('Error booking slot:', error);
      toast({
        title: "Booking failed",
        description: "That time slot may no longer be available. Please try a different time.",
        variant: "destructive"
      });
      return false;
    }
  };

  const cancelBooking = async () => {
    if (!user || !activeBooking) return false;

    try {
      const { data, error } = await supabase.rpc('cancel_viewing_booking', {
        slot_uuid: activeBooking.slot_id,
        tenant_uuid: user.id
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to cancel booking');

      // Send notification
      await supabase.functions.invoke('notify-viewing-booked', {
        body: {
          property_id: propertyId,
          landlord_id: landlordId,
          tenant_id: user.id,
          slot_id: activeBooking.slot_id,
          action: 'cancelled'
        }
      });

      toast({
        title: "Booking cancelled",
        description: "Your viewing appointment has been cancelled successfully."
      });

      await checkActiveBooking();
      await fetchAvailableSlots();
      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Cancellation failed",
        description: "Unable to cancel your booking. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateBooking = async (newSlotId: string) => {
    if (!user || !activeBooking) return false;

    try {
      const { data, error } = await supabase.rpc('update_viewing_booking', {
        old_slot_uuid: activeBooking.slot_id,
        new_slot_uuid: newSlotId,
        tenant_uuid: user.id
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to update booking');

      // Send notification
      await supabase.functions.invoke('notify-viewing-booked', {
        body: {
          property_id: propertyId,
          landlord_id: landlordId,
          tenant_id: user.id,
          slot_id: newSlotId,
          old_slot_id: activeBooking.slot_id,
          action: 'updated'
        }
      });

      toast({
        title: "Booking updated",
        description: "Your viewing appointment has been rescheduled successfully."
      });

      await checkActiveBooking();
      await fetchAvailableSlots();
      return true;
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Update failed",
        description: "Unable to reschedule your booking. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    loading,
    activeBooking,
    availableSlots,
    bookSlot,
    cancelBooking,
    updateBooking,
    checkActiveBooking,
    fetchAvailableSlots
  };
};