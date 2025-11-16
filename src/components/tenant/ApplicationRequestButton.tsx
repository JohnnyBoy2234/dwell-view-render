import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
      // Send notification to landlord using notifications table
      await (supabase
        .from('notifications')
        .insert({
          user_id: landlordId,
          type: 'application_request',
          message: `${user.email} has requested an application for ${propertyTitle}`,
          metadata: {
            tenantId: user.id,
            propertyId: propertyId,
            propertyTitle: propertyTitle
          }
        } as any) as any);

      setHasRequested(true);

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