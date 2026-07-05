// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { AlertCircle, CheckCircle, Home, Loader2 } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const plusOneYear = (isoDate: string) => {
  const d = isoDate ? new Date(isoDate) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export default function JoinProperty() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('This invitation link is invalid.');
        setLoading(false);
        return;
      }
      try {
        const { data, error: inviteErr } = await supabase
          .from('property_invites')
          .select('*')
          .eq('token', token)
          .maybeSingle();
        if (inviteErr) throw inviteErr;
        if (!data) {
          setError('This invitation could not be found. Please ask your landlord for a new link.');
          setLoading(false);
          return;
        }
        if (data.used_at && data.tenant_id && data.tenant_id !== user?.id) {
          setError('This invitation has already been used.');
          setLoading(false);
          return;
        }
        setInvite(data);

        // Property details may be restricted while signed out — best effort.
        const { data: prop } = await supabase
          .from('properties')
          .select('title, location')
          .eq('id', data.property_id)
          .maybeSingle();
        if (prop) setProperty(prop);
      } catch (e: any) {
        setError(e.message || 'Failed to load this invitation.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, user?.id]);

  const handleAccept = async () => {
    if (!invite) return;
    if (!user) {
      // Send them to sign up / sign in, then return here to finish.
      sessionStorage.setItem('returnTo', `/join/${token}`);
      navigate('/auth');
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      // 1) Create the tenancy FIRST — the RLS insert policy requires the
      //    invite to still be unused at this point.
      const { error: tenErr } = await supabase.from('tenancies').insert({
        property_id: invite.property_id,
        tenant_id: user.id,
        landlord_id: invite.landlord_id,
        start_date: invite.lease_start,
        end_date: invite.lease_end || plusOneYear(invite.lease_start),
        monthly_rent: invite.monthly_rent,
        security_deposit: 0,
        status: 'active',
      });
      if (tenErr) throw tenErr;

      // 2) Mark the invite as used and linked to this tenant.
      await supabase
        .from('property_invites')
        .update({ tenant_id: user.id, used_at: new Date().toISOString() })
        .eq('id', invite.id);

      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Could not accept this invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );

  if (loading || authLoading) {
    return (
      <Shell>
        <CardContent className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your invitation…</p>
        </CardContent>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Invitation problem</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>Go home</Button>
        </CardContent>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>You're all set!</CardTitle>
          <CardDescription>You've been connected to your rental. You can now manage everything from your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/tenant-dashboard')}>Go to my dashboard</Button>
        </CardContent>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Home className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>You've been invited</CardTitle>
        <CardDescription>
          {property?.title || property?.location
            ? `Join ${property.title || property.location} on MzanziHomes.`
            : 'Join your rental on MzanziHomes.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
          {property?.location && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium text-right">{property.location}</span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Monthly rent</span>
            <span className="font-medium">R{Number(invite.monthly_rent).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Starts</span>
            <span className="font-medium">{invite.lease_start}</span>
          </div>
        </div>
        <Button className="w-full" onClick={handleAccept} disabled={accepting}>
          {accepting ? 'Joining…' : user ? 'Accept & join' : 'Sign in to accept'}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          By accepting you'll be linked to this property as its tenant.
        </p>
      </CardContent>
    </Shell>
  );
}
