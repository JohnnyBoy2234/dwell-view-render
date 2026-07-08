// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { AlertCircle, CheckCircle2, Home, Loader2, PartyPopper, Sparkles, Calendar, Coins, KeyRound } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const plusOneYear = (isoDate: string) => {
  const d = isoDate ? new Date(isoDate) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

// Celebratory full-screen backdrop shared by every state.
function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20"
      style={{ minHeight: '100dvh' }}>
      {/* Soft floating glow blobs */}
      <div className="pointer-events-none absolute -top-28 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-success/10 blur-3xl animate-pulse" style={{ animationDelay: '0.6s' }} />
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-card rounded-3xl shadow-xl border border-border p-6 sm:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}

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

      // 3) Give the tenant a real display name (from the invite) if theirs is
      //    still a placeholder / email-derived handle, then notify the landlord.
      try {
        const invitedName = (invite.invitee_name || '').trim();
        const { data: me } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        const current = (me?.display_name || '').trim();
        // A real name has a space ("First Last"); single-token handles like
        // "gprpg89wjs" are treated as placeholders and replaced.
        if (invitedName && (!current || !current.includes(' '))) {
          await supabase.from('profiles').update({ display_name: invitedName }).eq('user_id', user.id);
        }
        const tenantName = invitedName || current || 'Your tenant';
        const where = property?.location || property?.title || 'your property';
        await supabase.from('notifications').insert({
          user_id: invite.landlord_id,
          title: 'Tenant joined 🎉',
          message: `${tenantName} accepted your invite and joined ${where}.`,
          type: 'system',
          action_url: '/enhancedlandlorddashboard',
        });
      } catch (notifyErr) {
        console.error('Post-join updates failed:', notifyErr);
      }

      // Tell the dashboard to greet them with a first-time welcome.
      localStorage.setItem('tenantWelcome', '1');
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Could not accept this invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Backdrop>
        <div className="py-10 flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-ocean-blue" />
          <p className="text-sm text-muted-foreground">Loading your invitation…</p>
        </div>
      </Backdrop>
    );
  }

  if (error) {
    return (
      <Backdrop>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-1">Invitation problem</h1>
          <p className="text-sm text-muted-foreground mb-5">{error}</p>
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>Go home</Button>
        </div>
      </Backdrop>
    );
  }

  if (done) {
    return (
      <Backdrop>
        <div className="text-center">
          <div className="mx-auto mb-4 relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-success/20 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-success flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="h-12 w-12 text-success-foreground" />
            </div>
            <PartyPopper className="absolute -top-1 -right-1 w-8 h-8 text-amber-400 drop-shadow animate-bounce" />
          </div>
          <h1 className="text-2xl font-extrabold mb-1">Welcome home! 🏡</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You're connected to your rental. Manage rent, messages and everything else from your dashboard.
          </p>
          <Button
            className="w-full h-12 text-base rounded-xl font-semibold shadow-lg"
            onClick={() => navigate('/tenant-dashboard')}
          >
            <KeyRound className="h-5 w-5 mr-2" /> Go to my dashboard
          </Button>
        </div>
      </Backdrop>
    );
  }

  return (
    <Backdrop>
      <div className="text-center">
        {/* Hero badge */}
        <div className="mx-auto mb-4 relative w-20 h-20">
          <div className="absolute inset-0 rounded-2xl rotate-6 bg-primary/30 blur-md" />
          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg bg-primary">
            <Home className="w-9 h-9 text-primary-foreground" />
          </div>
          <PartyPopper className="absolute -top-2 -right-2 w-7 h-7 text-amber-400 drop-shadow animate-bounce" />
          <Sparkles className="absolute -bottom-1 -left-2 w-5 h-5 text-ocean-blue/70 animate-pulse" />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-ocean-blue/80 mb-1">You're invited</p>
        <h1 className="text-2xl font-extrabold leading-tight mb-1">
          Your new home<br />awaits 🎉
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {property?.title || property?.location
            ? `Join ${property.title || property.location} on MzanziHomes.`
            : 'Your landlord has invited you to join your rental on MzanziHomes.'}
        </p>

        {/* Details */}
        <div className="rounded-2xl bg-muted/50 p-4 text-sm space-y-2.5 text-left mb-5">
          {property?.location && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-ocean-blue/10 flex items-center justify-center shrink-0">
                <Home className="h-4 w-4 text-ocean-blue" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Property</p>
                <p className="font-semibold truncate">{property.location}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Monthly rent</p>
              <p className="font-semibold">R{Number(invite.monthly_rent).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Starts</p>
              <p className="font-semibold">{invite.lease_start}</p>
            </div>
          </div>
        </div>

        <Button
          className="w-full h-12 text-base rounded-xl font-semibold shadow-lg active:scale-[0.98] transition"
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting ? (
            <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Joining…</>
          ) : user ? (
            <><KeyRound className="h-5 w-5 mr-2" /> Accept & move in</>
          ) : (
            <><Sparkles className="h-5 w-5 mr-2" /> Sign in to accept</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          By accepting you'll be linked to this property as its tenant.
        </p>
      </div>
    </Backdrop>
  );
}
