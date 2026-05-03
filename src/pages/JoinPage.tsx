// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingLogo } from '@/components/ui/LoadingLogo';

interface InviteData {
  id: string;
  property_id: string;
  landlord_id: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string | null;
  used_at: string | null;
}

interface PropertyData {
  id: string;
  title: string;
  location: string;
  property_type: string;
}

interface LandlordData {
  display_name: string;
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [landlord, setLandlord] = useState<LandlordData | null>(null);
  const [pageError, setPageError] = useState('');

  // Auth step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Details step
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [token]);

  // If the landlord is logged in, sign them out so the tenant can sign in
  useEffect(() => {
    if (user && invite && user.id === invite.landlord_id) {
      supabase.auth.signOut();
      toast({
        title: 'Logged out',
        description: 'Please sign in or create a tenant account to accept this invite.',
      });
    }
  }, [user?.id, invite?.landlord_id]);

  const loadInvite = async () => {
    setLoading(true);
    const { data: inv, error: invErr } = await supabase
      .from('property_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (invErr || !inv) {
      setPageError('This invite link is invalid.');
      setLoading(false);
      return;
    }
    if (inv.used_at) {
      setPageError('This invite link has already been used.');
      setLoading(false);
      return;
    }

    setInvite(inv);

    const [{ data: prop }, { data: land }] = await Promise.all([
      supabase.from('properties').select('id, title, location, property_type').eq('id', inv.property_id).single(),
      supabase.from('profiles').select('display_name').eq('user_id', inv.landlord_id).single(),
    ]);

    setProperty(prop);
    setLandlord(land);
    setLoading(false);
  };

  // A valid tenant session = logged in AND not the landlord
  const isTenantSession = !!(user && invite && user.id !== invite.landlord_id);

  const handleAuth = async () => {
    if (!email || !password) {
      toast({ title: 'Required', description: 'Please enter your email and password.', variant: 'destructive' });
      return;
    }
    setAuthLoading(true);

    if (isSignUp) {
      const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
        setAuthLoading(false);
        return;
      }
      // If email confirmation is required the session won't exist yet
      if (!signUpData.session) {
        toast({
          title: 'Check your email',
          description: 'Click the confirmation link we sent you, then return here and sign in.',
        });
        setIsSignUp(false);
        setAuthLoading(false);
        return;
      }
      // Pre-fill name from email prefix so the details form is partially done
      setFullName(email.split('@')[0].replace(/[._-]/g, ' '));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
        setAuthLoading(false);
        return;
      }
    }

    setAuthLoading(false);
  };

  const handleAccept = async () => {
    if (!user || !invite || !property) return;

    // Safety: block the landlord from accepting their own invite
    if (user.id === invite.landlord_id) {
      toast({ title: 'Error', description: 'You cannot accept your own invite.', variant: 'destructive' });
      return;
    }

    if (!fullName.trim()) {
      toast({ title: 'Required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upsert profile
      await supabase.from('profiles').upsert({
        user_id: user.id,
        display_name: fullName.trim(),
        phone: phone || null,
        id_number: idNumber || null,
      }, { onConflict: 'user_id' });

      // 2. Insert tenancy
      const { error: tenancyErr } = await supabase.from('tenancies').insert({
        property_id: invite.property_id,
        landlord_id: invite.landlord_id,
        tenant_id: user.id,
        monthly_rent: invite.monthly_rent,
        start_date: invite.lease_start,
        end_date: invite.lease_end ?? null,
        status: 'active',
        custom_clauses: {},
      });
      if (tenancyErr) throw tenancyErr;

      // 3. Mark invite used
      await supabase.from('property_invites').update({
        used_at: new Date().toISOString(),
        tenant_id: user.id,
      }).eq('id', invite.id);

      toast({ title: 'Welcome! 🎉', description: "You've been linked to the property." });
      navigate('/enhancedtenantdashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingLogo />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-500 mb-6">{pageError}</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const formattedRent = invite?.monthly_rent?.toLocaleString('en-ZA');
  const formattedDate = invite?.lease_start
    ? new Date(invite.lease_start).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 pb-12 px-4 pt-8">
      <div className="max-w-sm mx-auto space-y-4">

        {/* Property preview card */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md">
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-4 text-white">
            <div className="text-xs opacity-75 mb-1">You've been invited to</div>
            <div className="font-bold text-lg">{property?.title || property?.location}</div>
            {landlord && <div className="text-sm opacity-85 mt-0.5">by {landlord.display_name}</div>}
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">Monthly Rent</div>
              <div className="font-bold text-blue-800">R{formattedRent}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">Move-in Date</div>
              <div className="font-bold text-blue-800">{formattedDate}</div>
            </div>
          </div>
        </div>

        {/* Auth gate — shown when no valid tenant session */}
        {!isTenantSession && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-1">
              {isSignUp ? 'Create your tenant account' : 'Sign in to continue'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {isSignUp
                ? 'Enter your email to create an account and accept this invite.'
                : 'Sign in to your existing account to accept this invite.'}
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Choose a password' : 'Your password'}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAuth} disabled={authLoading} className="w-full">
                {authLoading ? 'Loading…' : isSignUp ? 'Create Account & Continue' : 'Sign In & Continue'}
              </Button>
              <button
                className="w-full text-center text-xs text-gray-500 hover:text-blue-600"
                onClick={() => setIsSignUp(s => !s)}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        )}

        {/* Details form — shown when a valid tenant session exists */}
        {isTenantSession && (
          <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-blue-800 mb-1">Almost done — confirm your details</h3>
            <p className="text-xs text-gray-500 mb-4">This links you to the property as a tenant</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Full name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">SA ID number</Label>
                <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Phone number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="mt-1" />
              </div>
              <Button
                onClick={handleAccept}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Registering…' : '✓ Accept & Register as Tenant'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
