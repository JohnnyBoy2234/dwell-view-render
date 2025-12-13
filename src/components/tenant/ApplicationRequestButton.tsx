import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { createApplicationRequest } from '@/services/applicationRequestService';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationRequestButtonProps {
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  className?: string;
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
  const [hasRequested, setHasRequested] = useState(false);

  // Check if there's already a pending request for this property
  useEffect(() => {
    if (!user) return;
    const checkExistingRequest = async () => {
      const { data } = await (supabase as any)
        .from('application_requests')
        .select('status')
        .eq('property_id', propertyId)
        .eq('tenant_id', user.id)
        .maybeSingle();
      
      if (data && ((data as any).status === 'pending' || (data as any).status === 'approved')) {
        setHasRequested(true);
      }
    };
    checkExistingRequest();
  }, [user, propertyId]);

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
      // Create application request using the proper service
      await createApplicationRequest({
        property_id: propertyId,
        tenant_id: user.id,
        landlord_id: landlordId
      });

      setHasRequested(true);

      toast({
        title: "Application requested",
        description: "Your request has been sent to the landlord. They will review and respond soon."
      });

    } catch (error: any) {
      console.error('Error requesting application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to request application. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id === landlordId) {
    return null;
  }

  return (
    <div className="space-y-2">
      {!hasRequested ? (
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
        <Badge variant="secondary">Application Requested</Badge>
      )}
    </div>
  );
};