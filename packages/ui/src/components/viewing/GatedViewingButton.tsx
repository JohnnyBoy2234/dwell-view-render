import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);

  if (!user) {
    return (
      <Button onClick={() => navigate('/auth')} className="w-full">
        <Calendar className="h-4 w-4 mr-2" />
        Sign in to Request Viewing
      </Button>
    );
  }

  if (user.id === landlordId) return null;

  // Email not verified
  if (!user.email_confirmed_at) {
    const handleResend = async () => {
      if (!user.email) return;
      setIsResending(true);
      try {
        const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
        if (error) throw error;
        toast.success("Verification email sent. Please check your inbox.");
      } catch (err: any) {
        toast.error(err.message || "Failed to send verification email");
      } finally {
        setIsResending(false);
      }
    };

    return (
      <div className="space-y-3">
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <Mail className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Verify your email to request a viewing.</strong>
            <br />
            Didn't get it?{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-amber-700 dark:text-amber-300 underline ml-1"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? 'Sending...' : 'Resend'}
            </Button>
          </AlertDescription>
        </Alert>
        <Button disabled className="w-full opacity-60">
          <Calendar className="h-4 w-4 mr-2" />
          Request Viewing
        </Button>
      </div>
    );
  }

  // All good — allow viewing request
  return (
    <StartConversation
      propertyId={propertyId}
      landlordId={landlordId}
      propertyTitle={propertyTitle}
      onConversationCreated={onViewingRequested}
    />
  );
}
