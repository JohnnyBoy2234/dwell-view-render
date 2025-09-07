import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationRequestButtonProps {
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  className?: string;
}

interface ApplicationRequestStatus {
  id: string;
  status: 'requested' | 'invited' | 'declined';
  created_at: string;
}

export const ApplicationRequestButton = ({ 
  propertyId, 
  landlordId, 
  propertyTitle, 
  className 
}: ApplicationRequestButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<ApplicationRequestStatus | null>(null);

  // Check if user has already requested application for this property
  const checkRequestStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('application_requests')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('property_id', propertyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking request status:', error);
        return;
      }

      if (data) {
        setRequestStatus(data as ApplicationRequestStatus);
      }
    } catch (error) {
      console.error('Error checking request status:', error);
    }
  };

  useState(() => {
    checkRequestStatus();
  });

  const handleRequestApplication = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to request an application."
      });
      return;
    }

    setLoading(true);
    
    try {
      // Insert application request
      const { data, error } = await supabase
        .from('application_requests')
        .insert({
          tenant_id: user.id,
          landlord_id: landlordId,
          property_id: propertyId,
          status: 'requested'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setRequestStatus(data as ApplicationRequestStatus);

      // Send notification to landlord
      await supabase.functions.invoke('notify-application-request', {
        body: {
          landlordId,
          tenantId: user.id,
          propertyId,
          propertyTitle
        }
      });

      toast({
        title: "Application requested",
        description: "Your request has been sent to the landlord. They will review and respond soon."
      });

    } catch (error) {
      console.error('Error requesting application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to request application. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRequest = async () => {
    if (!requestStatus) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('application_requests')
        .delete()
        .eq('id', requestStatus.id);

      if (error) {
        throw error;
      }

      setRequestStatus(null);

      toast({
        title: "Request withdrawn",
        description: "Your application request has been withdrawn."
      });

    } catch (error) {
      console.error('Error withdrawing request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to withdraw request. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="secondary">Application Requested</Badge>;
      case 'invited':
        return <Badge className="bg-green-100 text-green-800">Application Invited</Badge>;
      case 'declined':
        return <Badge variant="destructive">Application Declined</Badge>;
      default:
        return null;
    }
  };

  if (!user || user.id === landlordId) {
    return null;
  }

  return (
    <div className="space-y-2">
      {!requestStatus ? (
        <Button 
          variant="outline" 
          className={className}
          onClick={handleRequestApplication}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Requesting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Request Application
            </>
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          {getStatusBadge(requestStatus.status)}
          {requestStatus.status === 'requested' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseRequest}
              disabled={loading}
            >
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          )}
        </div>
      )}
    </div>
  );
};