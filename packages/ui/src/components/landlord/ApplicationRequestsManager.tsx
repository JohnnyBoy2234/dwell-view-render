import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { RecordCard } from '@mzanzihomes/ui/components/RecordCard';
import { Check, X, Clock } from 'lucide-react';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { createApplicationNotifications } from '@mzanzihomes/supabase/services/notificationHelpers';

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

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

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
      // application_requests stores auth user ids (matches its RLS policies
      // and the realtime filter below), not profiles.id
      let query = supabase
        .from('application_requests')
        .select(`
          *,
          properties(title, location),
          profiles!application_requests_tenant_id_fkey(display_name, avatar_url)
        `)
        .filter('landlord_id', 'eq', user.id)
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
          status: 'approved',
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
          status: 'rejected',
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
      <Card className="overflow-hidden w-full">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">Application Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending application requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden w-full">
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="truncate">Application Requests</span>
          <Badge variant="secondary" className="ml-auto flex-shrink-0">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6">
        {requests.map((request) => (
          <RecordCard
            key={request.id}
            title={request.profiles?.display_name || 'Unknown Tenant'}
            dateLine={`Requested ${shortDate(request.created_at)}`}
            badge={{ label: 'Pending', className: 'bg-blue-100 text-blue-800' }}
            details={[{ label: 'Property', value: request.properties?.title || 'Unknown Property' }]}
            actions={
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request)}
                  disabled={processingId === request.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
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
              </>
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
