import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOffers, type Offer } from '@/hooks/useOffers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface OfferCardProps {
  offer: Offer;
  isLandlord?: boolean;
}

export function OfferCard({ offer, isLandlord = false }: OfferCardProps) {
  const { acceptOffer, declineOffer } = useOffers();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: Offer['status']) => {
    switch (status) {
      case 'sent': return 'default';
      case 'accepted': return 'default';
      case 'declined': return 'destructive';
      case 'expired': return 'secondary';
      default: return 'default';
    }
  };

  const handleAccept = async () => {
    try {
      setLoading(true);
      const result = await acceptOffer(offer.id);
      
      if (result?.leaseId) {
        toast.success('Offer accepted! Lease created and sent for signature.');
      } else {
        toast.success('Offer accepted!');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setLoading(true);
      await declineOffer(offer.id);
      toast.success('Offer declined');
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error('Failed to decline offer');
    } finally {
      setLoading(false);
    }
  };

  const canRespond = !isLandlord && user?.id === offer.tenant_id && offer.status === 'sent';
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Lease Offer
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(offer.status)}>
              {offer.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {isExpired && <Badge variant="destructive">EXPIRED</Badge>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {offer.terms_json.address}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
            <p className="text-lg font-semibold">R {offer.terms_json.rent?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Deposit</p>
            <p className="text-lg font-semibold">R {offer.terms_json.deposit?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Start Date</p>
            <p className="text-sm">{offer.terms_json.start}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">End Date</p>
            <p className="text-sm">{offer.terms_json.end}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Payment Due</p>
            <p className="text-sm">Day {offer.terms_json.payment_day || 1} of each month</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Utilities</p>
            <p className="text-sm">
              {offer.terms_json.utilities_included ? 'Included' : 'Tenant Responsible'}
            </p>
          </div>
        </div>

        {offer.terms_json.notes && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Additional Terms</p>
            <p className="text-sm bg-muted p-3 rounded-md">{offer.terms_json.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Created {formatDistance(new Date(offer.created_at), new Date(), { addSuffix: true })}
          </span>
          {offer.expires_at && (
            <span>
              Expires {formatDistance(new Date(offer.expires_at), new Date(), { addSuffix: true })}
            </span>
          )}
        </div>

        {canRespond && !isExpired && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleDecline}
              disabled={loading}
            >
              Decline
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Accept & Create Lease'}
            </Button>
          </div>
        )}

        {offer.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800 font-medium">
              ✅ Offer accepted! A lease has been generated and sent for signatures.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}