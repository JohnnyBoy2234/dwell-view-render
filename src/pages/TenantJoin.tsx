// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TenantJoin() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error' | 'expired' | 'already_accepted'>('loading');
  const [invite, setInvite] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to auth with return URL
      sessionStorage.setItem('redirectTo', `/join/${token}`);
      navigate(`/auth?redirect=/join/${token}`);
      return;
    }

    // User is logged in, process the invite
    processInvite();
  }, [user, authLoading, token]);

  const processInvite = async () => {
    if (!token || !user) return;

    try {
      setStatus('loading');

      // Fetch the invite
      const { data: inviteData, error: fetchError } = await supabase
        .from('tenant_invites')
        .select('*, properties(id, title, location, price, property_type, landlord_id)')
        .eq('token', token)
        .maybeSingle();

      if (fetchError || !inviteData) {
        setStatus('error');
        setErrorMsg('This invite link is invalid or has expired.');
        return;
      }

      setInvite(inviteData);

      if (inviteData.status === 'accepted') {
        setStatus('already_accepted');
        return;
      }

      if (inviteData.status === 'expired') {
        setStatus('expired');
        return;
      }

      // Accept the invite
      setStatus('accepting');

      // Create tenancy record
      const { error: tenancyError } = await supabase
        .from('tenancies')
        .insert({
          property_id: inviteData.property_id,
          tenant_id: user.id,
          landlord_id: inviteData.landlord_id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          monthly_rent: inviteData.properties?.price || 0,
          security_deposit: 0,
          status: 'active',
        });

      if (tenancyError) {
        console.error('Error creating tenancy:', tenancyError);
        setStatus('error');
        setErrorMsg('Failed to link you to the property. Please contact the landlord.');
        return;
      }

      // Update invite status
      await supabase
        .from('tenant_invites')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          accepted_by: user.id 
        })
        .eq('id', inviteData.id);

      // Update property status to occupied
      await supabase
        .from('properties')
        .update({ status: 'occupied' })
        .eq('id', inviteData.property_id);

      // Send notification to landlord
      await supabase
        .from('notifications')
        .insert({
          user_id: inviteData.landlord_id,
          type: 'tenant_joined',
          title: 'Tenant Joined!',
          message: `A tenant has joined your property: ${inviteData.properties?.title || 'Property'}`,
          data: { property_id: inviteData.property_id, tenant_id: user.id },
        });

      setStatus('success');
      toast({ title: 'Welcome!', description: `You've been connected to ${inviteData.properties?.title || 'the property'}.` });

    } catch (error: any) {
      console.error('Error processing invite:', error);
      setStatus('error');
      setErrorMsg(error.message || 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {(status === 'loading' || status === 'accepting') && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-ocean-blue mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {status === 'loading' ? 'Loading invite...' : 'Connecting you to the property...'}
              </h2>
              <p className="text-muted-foreground">Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
              <p className="text-muted-foreground mb-2">
                You've been connected to <strong>{invite?.properties?.title}</strong>.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                You can now access all tenant tools including maintenance requests, payments, and more.
              </p>
              <Button onClick={() => navigate('/enhancedtenantdashboard')} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </>
          )}

          {status === 'already_accepted' && (
            <>
              <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Already Accepted</h2>
              <p className="text-muted-foreground mb-6">
                This invite has already been accepted. If this is your property, head to your dashboard.
              </p>
              <Button onClick={() => navigate('/enhancedtenantdashboard')} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </>
          )}

          {status === 'expired' && (
            <>
              <XCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invite Expired</h2>
              <p className="text-muted-foreground mb-6">
                This invite link has expired. Please ask your landlord to send a new one.
              </p>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Go Home
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-6">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Go Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}