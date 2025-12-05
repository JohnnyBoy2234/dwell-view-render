import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Mail, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGateStatus } from '@/hooks/useGateStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import StartConversation from '@/components/StartConversation';

interface GatedViewingButtonProps {
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  onViewingRequested?: () => void;
}

export function GatedViewingButton({ 
  propertyId, 
  landlordId, 
  propertyTitle,
  onViewingRequested
}: GatedViewingButtonProps) {
  const { user } = useAuth();
  const { gateStatus, loading } = useGateStatus();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Please check your email and click the verification link.",
      });

      // Log event
      await supabase.rpc('log_event', {
        _user_id: user.id,
        _name: 'email_verification_resent',
        _properties: {
          context: 'viewing_request_gate'
        }
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send verification email",
        description: error.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBlockedRequest = async (reason: string) => {
    if (user) {
      // Log the blocked attempt
      await supabase.rpc('log_event', {
        _user_id: user.id,
        _name: 'viewing_request_blocked',
        _properties: {
          reason,
          property_id: propertyId,
          landlord_id: landlordId
        }
      });
    }
  };

  if (!user) {
    return (
      <Button onClick={() => navigate('/auth')} className="w-full">
        <Calendar className="h-4 w-4 mr-2" />
        Sign in to Request Viewing
      </Button>
    );
  }

  if (user.id === landlordId) {
    return null; // Don't show button to property owner
  }

  if (loading) {
    return (
      <Button disabled className="w-full">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        Loading...
      </Button>
    );
  }

  // Email not verified case
  if (!gateStatus?.emailVerified) {
    return (
      <div className="space-y-3">
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <Mail className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Verify your email to request a viewing.</strong> 
            <br />
            Didn't get it? 
            <Button 
              variant="link" 
              className="p-0 h-auto text-amber-700 dark:text-amber-300 underline ml-1"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending ? 'Sending...' : 'Resend'}
            </Button>
          </AlertDescription>
        </Alert>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                disabled 
                className="w-full opacity-60" 
                onClick={() => handleBlockedRequest('EMAIL_NOT_VERIFIED')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Request Viewing
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Please verify your email to request a viewing.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Email verified but KYC not approved
  if (gateStatus.emailVerified && gateStatus.kycStatus !== 'approved') {
    const kycMessage = gateStatus.kycStatus === 'not_started' 
      ? 'Complete ID verification to request a viewing.'
      : gateStatus.kycStatus === 'submitted'
      ? 'Your ID verification is being reviewed.'
      : gateStatus.kycStatus === 'declined'
      ? 'Your ID verification was declined. Please resubmit.'
      : 'ID verification required.';

    const kycAction = gateStatus.kycStatus === 'declined' ? 'Try Again' : 'Upload ID and selfie to get verified';
    
    return (
      <div className="space-y-3">
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>{kycMessage}</strong>
            <br />
            <Button 
              variant="link" 
              className="p-0 h-auto text-blue-700 dark:text-blue-300 underline"
              onClick={() => navigate('/verify-id')}
            >
              {kycAction}
            </Button>
          </AlertDescription>
        </Alert>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                disabled 
                className="w-full opacity-60"
                onClick={() => handleBlockedRequest('KYC_NOT_APPROVED')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Request Viewing
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Please complete ID verification to request a viewing.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // All requirements met - allow viewing request
  if (gateStatus.canRequestViewing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-success-foreground">
          <CheckCircle2 className="h-4 w-4" />
          <span>Verified • Ready to request viewings</span>
        </div>
        
        <StartConversation
          propertyId={propertyId}
          landlordId={landlordId}
          propertyTitle={propertyTitle}
          onConversationCreated={onViewingRequested}
        />
      </div>
    );
  }

  // Fallback - something went wrong
  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to verify your account status. Please try again or contact support.
        </AlertDescription>
      </Alert>
      
      <Button disabled className="w-full">
        <Calendar className="h-4 w-4 mr-2" />
        Request Viewing
      </Button>
    </div>
  );
}