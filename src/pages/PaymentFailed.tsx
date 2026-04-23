import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, RotateCcw, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const failureReasons: Record<string, { title: string; message: string }> = {
  insufficient_funds: {
    title: 'Insufficient Funds',
    message: 'Your account does not have sufficient funds to complete this payment.',
  },
  declined: {
    title: 'Payment Declined',
    message: 'Your payment was declined by your bank. Please check your card details or try another payment method.',
  },
  timeout: {
    title: 'Payment Timeout',
    message: 'Your payment session has timed out. Please try again.',
  },
  cancelled: {
    title: 'Payment Cancelled',
    message: 'You cancelled the payment. No charges were made to your account.',
  },
  error: {
    title: 'Payment Error',
    message: 'An error occurred while processing your payment. Please try again or contact support if the issue persists.',
  },
  general: {
    title: 'Payment Failed',
    message: 'We were unable to process your payment. Please try again or contact support.',
  },
};

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const reason = searchParams.get('reason') || 'general';
  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Show toast notification on mount
    toast.error(failureInfo.title, {
      description: failureInfo.message,
      duration: 5000,
    });
  }, [user, navigate]);

  const handleReturnToDashboard = () => {
    if (isLandlord) {
      navigate('/enhancedlandlorddashboard');
    } else {
      navigate('/enhancedtenantdashboard');
    }
  };

  const failureInfo = failureReasons[reason] || failureReasons.general;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">{failureInfo.title}</CardTitle>
          <CardDescription>
            {failureInfo.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reference && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <p className="font-mono text-sm font-medium">{reference}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/pricing')}
              className="w-full flex items-center gap-2"
              variant="default"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>

            <Button 
              onClick={handleReturnToDashboard}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Button>

            <Button 
              onClick={() => window.location.href = 'mailto:support@mzanzihomes.com'}
              className="w-full flex items-center gap-2"
              variant="ghost"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
          </div>

          <div className="text-xs text-muted-foreground pt-4">
            Need help? Email us at support@mzanzihomes.com
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
