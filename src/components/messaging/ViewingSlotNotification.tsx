import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Eye, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { BookViewingDialog } from '@/components/viewing/BookViewingDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ViewingSlotNotificationProps {
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
}

interface ViewingSlot {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

export function ViewingSlotNotification({ 
  propertyId, 
  landlordId, 
  propertyTitle 
}: ViewingSlotNotificationProps) {
  const { user } = useAuth();
  const [availableSlots, setAvailableSlots] = useState<ViewingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  useEffect(() => {
    fetchAvailableSlots();
  }, [propertyId]);

  const fetchAvailableSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('viewing_slots')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'available')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching viewing slots:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || availableSlots.length === 0 || user?.id === landlordId) {
    return null;
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Viewing Times Available
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {availableSlots.length} slots
                  </Badge>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Book a viewing for "{propertyTitle}"
                </p>
              </div>

              <div className="space-y-2">
                {availableSlots.slice(0, 2).map((slot) => (
                  <div 
                    key={slot.id}
                    className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200"
                  >
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(slot.start_time), "EEE, MMM d")} at{' '}
                      {format(new Date(slot.start_time), "h:mm a")}
                    </span>
                  </div>
                ))}
                {availableSlots.length > 2 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    +{availableSlots.length - 2} more available
                  </div>
                )}
              </div>

              <Button
                onClick={() => setShowBookingDialog(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Eye className="h-4 w-4 mr-1" />
                Book Viewing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BookViewingDialog
        propertyId={propertyId}
        landlordId={landlordId}
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
      />
    </>
  );
}