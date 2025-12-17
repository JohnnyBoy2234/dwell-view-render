import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, User, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createApplicationNotifications } from '@/utils/notificationHelpers';

interface ApplicationRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  status: string;
  created_at: string;
  properties?: {
    title: string;
    location: string;
  };
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface ApplicationRequestsManagerProps {
  propertyId?: string;
}

export function ApplicationRequestsManager({ propertyId }: ApplicationRequestsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApplicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
      subscribeToRequests();
    }
  }, [user, propertyId]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // First get the landlord's profile ID
      const { data: landlordProfile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!landlordProfile) {
        setRequests([]);
        return;
      }

      let query = supabase
        .from('application_requests')
        .select(`
          *,
          properties(title, location),
          profiles!application_requests_tenant_id_fkey(display_name, avatar_url)
        `)
        .filter('landlord_id', 'eq', (landlordProfile as any).id)
        .filter('status', 'eq', 'pending')
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.filter('property_id', 'eq', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching application requests:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading requests',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRequests = () => {
    if (!user) return;

    const channel = supabase
      .channel('application_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_requests',
          filter: `landlord_id=eq.${user.id}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleApprove = async (request: ApplicationRequest) => {
    if (!user) return;

    setProcessingId(request.id);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('application_requests')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        } as any)
        .filter('id', 'eq', request.id);

      if (updateError) throw updateError;

      // Send notification to tenant
      await createApplicationNotifications.requestApproved(
        request.tenant_id,
        request.properties?.title || 'the property',
        request.id
      );

      toast({
        title: 'Request approved',
        description: 'The tenant can now start their application.'
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        variant: 'destructive',
        title: 'Error approving request',
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (request: ApplicationRequest) => {
    if (!user) return;

    setProcessingId(request.id);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('application_requests')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        } as any)
        .filter('id', 'eq', request.id);

      if (updateError) throw updateError;

      // Send notification to tenant
      await createApplicationNotifications.requestDeclined(
        request.tenant_id,
        request.properties?.title || 'the property',
        request.id
      );

      toast({
        title: 'Request declined',
        description: 'The tenant has been notified.'
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error declining request:', error);
      toast({
        variant: 'destructive',
        title: 'Error declining request',
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Application Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending application requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Application Requests
          <Badge variant="secondary">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        {requests.map((request) => (
          <Card key={request.id} className="border-2 min-w-0">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="font-semibold line-clamp-1">
                        {request.profiles?.display_name || 'Unknown Tenant'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Home className="h-4 w-4 flex-shrink-0" />
                      <p className="line-clamp-1">{request.properties?.title || 'Unknown Property'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={processingId === request.id}
                    className="w-full sm:w-auto flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processingId === request.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(request)}
                    disabled={processingId === request.id}
                    className="w-full sm:w-auto flex-1"
                  >
                    {processingId === request.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
