import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ViewingProposal {
  id: string;
  conversation_id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  start_at: string;
  duration_minutes: number;
  status: 'proposed' | 'confirmed' | 'declined' | 'cancelled' | 'expired';
  notes?: string;
  created_by: string;
  created_at: string;
  properties?: {
    title: string;
    location: string;
  };
}

interface ViewingProposalCardProps {
  proposal: ViewingProposal;
  onUpdate?: () => void;
}

export function ViewingProposalCard({ proposal, onUpdate }: ViewingProposalCardProps) {
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Convert UTC time to Africa/Johannesburg timezone
  const localStartTime = toZonedTime(new Date(proposal.start_at), 'Africa/Johannesburg');
  const endTime = new Date(localStartTime.getTime() + proposal.duration_minutes * 60 * 1000);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'declined': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'declined': case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'proposed': return 'Awaiting confirmation';
      case 'confirmed': return 'Viewing confirmed';
      case 'declined': return 'Declined';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const handleConfirm = async () => {
    if (!user || proposal.status !== 'proposed') return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-viewing-proposal', {
        body: { proposalId: proposal.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Viewing confirmed",
        description: "You'll receive reminders before the viewing time.",
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error confirming proposal:', error);
      toast({
        variant: "destructive",
        title: "Error confirming viewing",
        description: error.message || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!user || proposal.status !== 'proposed') return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('decline-viewing-proposal', {
        body: { proposalId: proposal.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Viewing declined",
        description: "The landlord has been notified.",
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error declining proposal:', error);
      toast({
        variant: "destructive",
        title: "Error declining viewing",
        description: error.message || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const canTakeAction = user && !isLandlord && user.id === proposal.tenant_id && proposal.status === 'proposed';

  return (
    <Card className="w-full max-w-full bg-gradient-to-br from-background to-muted/20 border-2">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Request Viewing</span>
          </div>
          <Badge className={`${getStatusColor(proposal.status)} flex items-center gap-1 text-xs`}>
            {getStatusIcon(proposal.status)}
            {getStatusText(proposal.status)}
          </Badge>
        </div>

        {/* Property Details */}
        {proposal.properties && (
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground break-words">{proposal.properties.title}</h4>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="break-words">{proposal.properties.location}</span>
            </div>
          </div>
        )}

        {/* Date and Time */}
        <div className="bg-white/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {format(localStartTime, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {format(localStartTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
            <span className="text-xs text-muted-foreground">SAST</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Duration: {proposal.duration_minutes} minutes
          </div>
        </div>

        {/* Notes */}
        {proposal.notes && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
            <strong>Note:</strong> <span className="break-words">{proposal.notes}</span>
          </div>
        )}

        {/* Actions for Tenant */}
        {canTakeAction && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              {loading ? 'Confirming...' : 'Confirm'}
            </Button>
            <Button
              onClick={handleDecline}
              disabled={loading}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              {loading ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        )}

        {/* Status message for confirmed viewings */}
        {proposal.status === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="flex items-center gap-2 text-green-800 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Viewing confirmed! You'll receive reminders.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}