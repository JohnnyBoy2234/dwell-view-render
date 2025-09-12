import { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, User, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PropertyViewing {
  id: string;
  property_id: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'completed' | 'cancelled';
  notes?: string;
  property?: {
    title: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    images?: string[];
  };
  landlord?: {
    display_name: string;
    phone?: string;
  };
}

export default function TenantPropertyViewings() {
  const { user } = useAuth();
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
      // For now, using mock data since the database schema needs adjustment
      // In a real implementation, this would fetch from viewing_slots table
      const mockViewings = [
        {
          id: '1',
          property_id: 'prop1',
          start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          end_time: new Date(Date.now() + 90000000).toISOString(),
          status: 'booked' as const,
          property: {
            title: 'Modern 2-Bedroom Apartment',
            location: 'Cape Town City Centre',
            price: 18000,
            bedrooms: 2,
            bathrooms: 2,
            images: []
          },
          landlord: {
            display_name: 'John Smith',
            phone: '+27123456789'
          }
        },
        {
          id: '2',
          property_id: 'prop2',
          start_time: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          end_time: new Date(Date.now() - 82800000).toISOString(),
          status: 'completed' as const,
          property: {
            title: 'Cozy Studio in Green Point',
            location: 'Green Point, Cape Town',
            price: 12000,
            bedrooms: 1,
            bathrooms: 1,
            images: []
          },
          landlord: {
            display_name: 'Sarah Johnson',
            phone: '+27987654321'
          }
        }
      ];

      setViewings(mockViewings);
    } catch (error: any) {
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
      const { error } = await supabase
        .from('viewing_slots')
        .update({ 
          status: 'available',
          booked_by_tenant_id: null
        })
        .eq('id', viewingId);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'booked':
        return <Badge className="bg-blue-500 text-white">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-success-green text-white">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-green" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Calendar className="h-5 w-5 text-ocean-blue" />;
    }
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const upcomingViewings = viewings.filter(v => v.status === 'booked' && isUpcoming(v.start_time));
  const pastViewings = viewings.filter(v => v.status === 'completed' || !isUpcoming(v.start_time));

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
              <Button onClick={() => window.location.href = '/properties'}>
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingViewings.map((viewing) => (
              <Card key={viewing.id} className="hover:shadow-medium transition-all duration-200 border-ocean-blue/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(viewing.status)}
                      <div>
                        <h3 className="font-semibold text-lg">{viewing.property?.title}</h3>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {viewing.property?.location}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(viewing.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(viewing.start_time).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {new Date(viewing.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(viewing.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{viewing.landlord?.display_name || 'Landlord'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{viewing.property?.bedrooms} bed • {viewing.property?.bathrooms} bath</span>
                      <span className="font-semibold text-foreground">
                        R{viewing.property?.price?.toLocaleString()}/month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {viewing.landlord?.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`tel:${viewing.landlord?.phone}`)}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
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
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              <Card key={viewing.id} className="opacity-75 hover:opacity-100 transition-opacity">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(viewing.status)}
                      <div>
                        <h3 className="font-semibold">{viewing.property?.title}</h3>
                        <p className="text-muted-foreground flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {viewing.property?.location}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(viewing.status)}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(viewing.start_time).toLocaleDateString()}
                      </span>
                      <span>{viewing.property?.bedrooms} bed • {viewing.property?.bathrooms} bath</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      R{viewing.property?.price?.toLocaleString()}/month
                    </span>
                  </div>
                </CardContent>
              </Card>
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