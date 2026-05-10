import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard } from 'lucide-react';

interface PaymentRequestButtonProps {
  tenancyId: string;
  monthlyRent: number;
  securityDeposit?: number;
  disabled?: boolean;
}

export function PaymentRequestButton({ 
  tenancyId, 
  monthlyRent, 
  securityDeposit = 0,
  disabled = false 
}: PaymentRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRequestPayment = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('initialize-paystack-transaction', {
        body: { tenancyId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment request');
      }

      // Open payment URL in new tab
      window.open(data.authorization_url, '_blank');

      toast({
        title: "Payment Request Created",
        description: `Payment link has been generated. Total amount: R${data.amount.toLocaleString()}`
      });

    } catch (error: any) {
      console.error('Payment request error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Create Payment Request",
        description: error.message || "Please try again or contact support."
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = monthlyRent + securityDeposit;

  return (
    <Button 
      onClick={handleRequestPayment} 
      disabled={loading || disabled}
      className="flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating payment request...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          Request Initial Payment (R{totalAmount.toLocaleString()})
        </>
      )}
    </Button>
  );
}