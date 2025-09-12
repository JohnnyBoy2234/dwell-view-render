import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useOffers } from '@/hooks/useOffers';
import { toast } from 'sonner';

interface OfferComposerProps {
  propertyId: string;
  tenantId: string;
  propertyData?: {
    title?: string;
    location?: string;
    rent_suggestion?: number;
  };
  onOfferCreated?: () => void;
}

export function OfferComposer({ 
  propertyId, 
  tenantId, 
  propertyData,
  onOfferCreated 
}: OfferComposerProps) {
  const { createOffer } = useOffers(propertyId);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    rent: propertyData?.rent_suggestion || 0,
    deposit: (propertyData?.rent_suggestion || 0) * 1.5, // 1.5x rent default
    start: '',
    end: '',
    payment_day: 1,
    utilities_included: false,
    notes: '',
    expires_in_days: 7
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.rent || !formData.deposit || !formData.start || !formData.end) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formData.expires_in_days);

      await createOffer({
        listing_id: propertyId,
        tenant_id: tenantId,
        terms_json: {
          rent: formData.rent,
          deposit: formData.deposit,
          start: formData.start,
          end: formData.end,
          address: propertyData?.location || '',
          payment_day: formData.payment_day,
          utilities_included: formData.utilities_included,
          notes: formData.notes
        },
        expires_at: expiresAt.toISOString()
      });

      toast.success('Offer sent successfully!');
      onOfferCreated?.();
      
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📝</span>
          Create Offer
        </CardTitle>
        {propertyData?.title && (
          <p className="text-sm text-muted-foreground">
            For: {propertyData.title}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rent">Monthly Rent (ZAR) *</Label>
              <Input
                id="rent"
                type="number"
                value={formData.rent}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  rent: parseInt(e.target.value) || 0 
                }))}
                placeholder="15000"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="deposit">Security Deposit (ZAR) *</Label>
              <Input
                id="deposit"
                type="number"
                value={formData.deposit}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deposit: parseInt(e.target.value) || 0 
                }))}
                placeholder="22500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start">Lease Start Date *</Label>
              <Input
                id="start"
                type="date"
                value={formData.start}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  start: e.target.value 
                }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="end">Lease End Date *</Label>
              <Input
                id="end"
                type="date"
                value={formData.end}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  end: e.target.value 
                }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_day">Payment Due Day</Label>
              <Input
                id="payment_day"
                type="number"
                min="1"
                max="31"
                value={formData.payment_day}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  payment_day: parseInt(e.target.value) || 1 
                }))}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Day of the month rent is due
              </p>
            </div>
            
            <div>
              <Label htmlFor="expires">Offer Expires In</Label>
              <Input
                id="expires"
                type="number"
                min="1"
                max="30"
                value={formData.expires_in_days}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  expires_in_days: parseInt(e.target.value) || 7 
                }))}
                placeholder="7"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Days until offer expires
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="utilities"
              checked={formData.utilities_included}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                utilities_included: checked 
              }))}
            />
            <Label htmlFor="utilities">Utilities Included in Rent</Label>
          </div>

          <div>
            <Label htmlFor="notes">Additional Terms & Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                notes: e.target.value 
              }))}
              placeholder="Any special conditions, pet policy, parking, etc..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Offer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}