import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


interface ApplicationInvite {
  id: string;
  token: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  conversation_id?: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
}

export default function ApplyInvite() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<ApplicationInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError('Invalid invitation link.');
        setLoading(false);
        return;
      }

      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('application_invites')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setError('Invitation not found.');
          return;
        }

        // Validate invite
        const isExpired = new Date(data.expires_at) < new Date();
        const isUsed = !!data.used_at || data.status === 'used';
        const isOwner = data.tenant_id === user.id;

        if (!isOwner) {
          setError('This invitation is not for your account.');
          return;
        }
        if (isExpired) {
          setError('This invitation link has expired.');
          return;
        }
        if (isUsed) {
          setError('This invitation link has already been used.');
          return;
        }

        setInvite(data as ApplicationInvite);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to load invitation.');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token, user]);

  const handleComplete = async () => {
    if (!invite) return;
    try {
      await supabase
        .from('application_invites')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('id', invite.id);
      setCompleted(true);
    } catch (e) {
      console.error('Failed to mark invite as used', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>We couldn't open your application invite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate('/tenant-dashboard')}>Go to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Application Submitted</CardTitle>
            <CardDescription>Your application has been sent to the landlord</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <p className="text-sm">Thank you for applying. You can follow up in your messages if needed.</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate('/tenant-dashboard')}>Go to Dashboard</Button>
              <Button variant="outline" onClick={() => navigate('/messages')}>Open Messages</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStartApplication = () => {
    // Navigate to rental application form with invite parameters
    navigate(`/rental-application/${invite.property_id}?landlord=${invite.landlord_id}&invite=${invite.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Application Invitation</CardTitle>
            <CardDescription>
              You've been invited to apply for this property. Complete the rental application to proceed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg mb-4">Application invitation received!</p>
              <p className="text-sm text-muted-foreground mb-6">
                Click "Start Application" to complete your rental application form.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleStartApplication}>Start Application</Button>
                <Button variant="outline" onClick={() => navigate('/tenant-dashboard')}>Go to Dashboard</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
