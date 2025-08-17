import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard } from 'lucide-react';

interface PaystackOnboardingProps {
  onSetupComplete: () => void;
}

// South African major banks
const SOUTH_AFRICAN_BANKS = [
  { code: "632005", name: "ABSA Bank" },
  { code: "470010", name: "Capitec Bank" },
  { code: "238731", name: "Discovery Bank" },
  { code: "450105", name: "FNB (First National Bank)" },
  { code: "410506", name: "Investec Bank" },
  { code: "198765", name: "Nedbank" },
  { code: "051001", name: "Standard Bank" },
  { code: "584131", name: "African Bank" },
  { code: "679000", name: "Bidvest Bank" },
  { code: "450116", name: "RMB Private Bank" }
];

export function PaystackOnboarding({ onSetupComplete }: PaystackOnboardingProps) {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bankName || !formData.accountNumber || !formData.accountHolderName) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-paystack-subaccount', {
        body: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountHolderName: formData.accountHolderName
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to set up payments');
      }

      toast({
        title: "Payment Setup Complete!",
        description: "You can now start collecting rent payments from tenants."
      });

      onSetupComplete();
    } catch (error: any) {
      console.error('Payment setup error:', error);
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message || "Failed to set up payment account. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          <CreditCard className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Set Up Payment Account</CardTitle>
        <CardDescription>
          Connect your bank account to start receiving rent payments directly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input
              id="accountHolderName"
              type="text"
              placeholder="Your full name as it appears on your bank account"
              value={formData.accountHolderName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank</Label>
            <Select 
              value={formData.bankName} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, bankName: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {SOUTH_AFRICAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.name}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              type="text"
              placeholder="Your bank account number"
              value={formData.accountNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
              required
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-2">🔒 Secure & Safe</p>
            <p>Your banking details are securely processed by Paystack and encrypted to the highest standards. We never store your full account details.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up payment account...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}