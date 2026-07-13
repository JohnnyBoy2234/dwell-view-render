// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { RecordCard } from '@mzanzihomes/ui/components/RecordCard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';

interface PropertyViewing {
  id: string;
  property_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  property?: {
    id: string;
    title: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    images?: string[];
    landlord_id?: string;
  };
  landlord?: {
    display_name: string;
    phone?: string;
    user_id?: string;
  };
  landlord_id?: string;
  conversation_id?: string;
}

export default function TenantPropertyViewings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewings, setViewings] = useState<PropertyViewing[]>([]);

  useEffect(() => {
    if (user) {
      fetchViewings();
    }
  }, [user]);

  const fetchViewings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // PRODUCTION SCHEMA WARNING: the deployed viewing_slots is the old
      // booking-slot table (start_time/end_time/booked_by_tenant_id, status
      // available|booked|completed) — the proposal-style table in
      // 20250908173443 never applied remotely because of `if not exists`.
      // Query the shape production actually has; see types.ts.
      const { data: viewingSlots, error } = await supabase
        .from('viewing_slots')
        .select('id, property_id, landlord_id, start_time, end_time, status')
        .eq('booked_by_tenant_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      if (!viewingSlots || viewingSlots.length === 0) {
        setViewings([]);
        return;
      }

      // Fetch property details for each slot
      const propertyIds = [...new Set(viewingSlots.map(slot => slot.property_id))];
      
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, location, price, bedrooms, bathrooms, images, landlord_id')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;

      // Fetch landlord details
      const landlordIds = [...new Set(properties?.map(property => property.landlord_id).filter(Boolean) || [])];
      
      const { data: landlordProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, phone')
        .in('user_id', landlordIds);

      if (profilesError) throw profilesError;

      // Map the data to match the component's interface
      const mappedViewings: PropertyViewing[] = viewingSlots.map(slot => {
        const property = properties?.find(p => p.id === slot.property_id);
        const landlordProfile = landlordProfiles?.find(profile => profile.user_id === (slot.landlord_id || property?.landlord_id));
        
        return {
          id: slot.id,
          property_id: slot.property_id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: slot.status,
          conversation_id: undefined,
          property: property ? {
            id: property.id,
            title: property.title,
            location: property.location,
            price: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            images: property.images,
            landlord_id: property.landlord_id
          } : undefined,
          landlord: landlordProfile ? {
            display_name: landlordProfile.display_name,
            phone: landlordProfile.phone,
            user_id: landlordProfile.user_id
          } : undefined
        };
      });

      setViewings(mappedViewings);
    } catch (error: any) {
      console.error('Error fetching viewings:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading viewings',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelViewing = async (viewingId: string) => {
    try {
      // Cancelling frees the slot for other tenants to book
      const { error } = await supabase
        .from('viewing_slots')
        .update({
          status: 'available',
          booked_by_tenant_id: null
        })
        .eq('id', viewingId)
        .eq('status', 'booked');

      if (error) throw error;

      toast({
        title: 'Viewing cancelled',
        description: 'The viewing has been cancelled successfully.'
      });

      fetchViewings(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error cancelling viewing',
        description: error.message
      });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'booked':
        return { label: 'Upcoming', className: 'bg-blue-500 text-white' };
      case 'completed':
        return { label: 'Completed', className: 'bg-success-green text-white' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'destructive' as const };
      default:
        return { label: status, variant: 'outline' as const };
    }
  };

  const viewingDateLine = (viewing: PropertyViewing) => {
    const day = new Date(viewing.start_time).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const time = (value: string) =>
      new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${time(viewing.start_time)} – ${time(viewing.end_time)}`;
  };

  const viewingDetails = (viewing: PropertyViewing) =>
    [
      viewing.property?.location && { label: 'Location', value: viewing.property.location },
      viewing.property?.price && { label: 'Rent', value: `R${viewing.property.price.toLocaleString()}/month` },
      viewing.landlord?.display_name && { label: 'Landlord', value: viewing.landlord.display_name }
    ].filter(Boolean);

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const upcomingViewings = viewings.filter(v => v.status === 'booked' && isUpcoming(v.start_time));
  const pastViewings = viewings.filter(v => !upcomingViewings.includes(v));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Viewings</h1>
        <p className="text-muted-foreground">
          Manage your upcoming and past property viewings
        </p>
      </div>

      {/* Upcoming Viewings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upcoming Viewings</h2>
          <Badge variant="secondary">{upcomingViewings.length} scheduled</Badge>
        </div>

        {upcomingViewings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No upcoming viewings</h3>
              <p className="text-muted-foreground mb-4">
                Browse available properties to schedule your next viewing
              </p>
              <Button onClick={() => navigate('/properties')}>
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingViewings.map((viewing) => (
              <RecordCard
                key={viewing.id}
                title={viewing.property?.title || 'Property'}
                dateLine={viewingDateLine(viewing)}
                badge={statusBadge(viewing.status)}
                details={viewingDetails(viewing)}
                actions={
                  <>
                    {(viewing.conversation_id || viewing.landlord?.user_id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (viewing.conversation_id) {
                            navigate(`/messages?c=${viewing.conversation_id}`);
                          } else if (viewing.property?.id && viewing.property.landlord_id) {
                            navigate(`/messages?propertyId=${viewing.property.id}&landlordId=${viewing.property.landlord_id}`);
                          }
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelViewing(viewing.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Cancel
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Viewings */}
      {pastViewings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Past Viewings</h2>
            <Badge variant="secondary">{pastViewings.length} completed</Badge>
          </div>

          <div className="grid gap-4">
            {pastViewings.map((viewing) => (
              <RecordCard
                key={viewing.id}
                title={viewing.property?.title || 'Property'}
                dateLine={viewingDateLine(viewing)}
                badge={statusBadge(viewing.status)}
                details={viewingDetails(viewing)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Viewing Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Before your viewing:</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Arrive on time and bring valid ID</li>
                <li>Prepare questions about the property and lease terms</li>
                <li>Take notes and photos if permitted</li>
                <li>Check for any maintenance issues or concerns</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Need to reschedule?</h4>
              <p className="text-muted-foreground">
                Contact the landlord as soon as possible if you need to change your viewing time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}