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
  start_at?: string | null;
  duration_minutes?: number | null;
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
  isLandlordInConversation?: boolean;
}

export function ViewingProposalCard({ proposal, onUpdate, isLandlordInConversation }: ViewingProposalCardProps) {
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const navigateToInvite = (token: string) => {
    try {
      window.location.href = `/apply/invite/${token}`;
    } catch (e) {
      console.error('Failed to navigate to invite:', e);
    }
  };

  // Early return if proposal is not available
  if (!proposal) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading viewing proposal...</p>
      </div>
    );
  }

  const hasStartTime = !!proposal.start_at;
  const localStartTime = hasStartTime
    ? toZonedTime(new Date(proposal.start_at!), 'Africa/Johannesburg')
    : null;
  const durationMinutes = proposal.duration_minutes ?? 20;
  const endTime = localStartTime
    ? new Date(localStartTime.getTime() + durationMinutes * 60 * 1000)
    : null;

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

  // Use conversation-specific landlord flag if provided to avoid misclassification when a user has both roles
  const effectiveIsLandlord = typeof isLandlordInConversation === 'boolean' ? isLandlordInConversation : isLandlord;
  const canTakeAction = user && !effectiveIsLandlord && user.id === proposal.tenant_id && proposal.status === 'proposed';
  const canStartApplication = user && !effectiveIsLandlord && user.id === proposal.tenant_id && proposal.status === 'confirmed';

  const handleStartApplication = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Find existing invite
      const { data: existing, error: findError } = await supabase
        .from('application_invites')
        .select('token')
        .eq('tenant_id', user.id)
        .eq('property_id', proposal.property_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;
      if (existing?.token) {
        navigateToInvite(existing.token);
        return;
      }

      // Create a new invite if none exists
      const token = crypto.randomUUID();
      const { error: createError } = await supabase
        .from('application_invites')
        .insert({
          token,
          property_id: proposal.property_id,
          landlord_id: proposal.landlord_id,
          tenant_id: user.id,
          status: 'invited'
        });
      if (createError) throw createError;
      navigateToInvite(token);
    } catch (error: any) {
      console.error('Error starting application:', error);
      toast({
        variant: 'destructive',
        title: 'Could not start application',
        description: error?.message || 'Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

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
        {hasStartTime ? (
          <div className="bg-white/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {format(localStartTime!, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {format(localStartTime!, 'h:mm a')} - {endTime ? format(endTime, 'h:mm a') : 'N/A'}
              </span>
              <span className="text-xs text-muted-foreground">SAST</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Duration: {durationMinutes} minutes
            </div>
          </div>
        ) : (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 text-sm">
            <strong>Viewing time unavailable.</strong> Please contact the landlord to reschedule.
          </div>
        )}

        {/* Notes */}
        {proposal.notes && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
            <strong>Note:</strong> <span className="break-words">{proposal.notes}</span>
          </div>
        )}

        {/* Actions for Tenant */}
        {canTakeAction && hasStartTime && (
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
        {!hasStartTime && (
          <div className="pt-2 text-xs text-muted-foreground text-right">
            Awaiting schedule details from landlord.
          </div>
        )}

        {/* Status message for confirmed viewings */}
        {proposal.status === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="flex items-center gap-2 text-green-800 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Viewing confirmed! You'll receive reminders.</span>
            </div>
            {canStartApplication && (
              <div className="pt-2">
                <Button size="sm" onClick={handleStartApplication} disabled={loading}>
                  {loading ? 'Opening…' : 'Start Application'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}