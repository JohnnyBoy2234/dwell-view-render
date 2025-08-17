import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const [reference] = useState(searchParams.get('reference'));

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  const handleReturnToDashboard = () => {
    if (isLandlord) {
      navigate('/dashboard');
    } else {
      navigate('/tenant-dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
          <CardDescription>
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reference && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <p className="font-mono text-sm font-medium">{reference}</p>
            </div>
          )}
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✅ Your payment has been confirmed</p>
            <p>✅ The landlord has been notified</p>
            <p>✅ You'll receive a confirmation email shortly</p>
          </div>

          <Button 
            onClick={handleReturnToDashboard}
            className="w-full flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}