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
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Details step
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [token]);

  useEffect(() => {
    if (user && invite) {
      // Re-fetch to confirm invite is still valid under authenticated session
      loadInvite();
    }
  }, [user?.id]);

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

  const handleAuth = async () => {
    if (!email || !password) {
      toast({ title: 'Required', description: 'Please enter email and password.', variant: 'destructive' });
      return;
    }
    setAuthLoading(true);
    let authError;
    if (isSignUp) {
      const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
      authError = error;
      if (!error && !signUpData.session) {
        toast({
          title: 'Check your email',
          description: 'Click the confirmation link in your email, then return to this page and sign in.',
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      authError = error;
    }
    setAuthLoading(false);
    if (authError) {
      toast({ title: 'Auth error', description: authError.message, variant: 'destructive' });
    }
  };

  const handleAccept = async () => {
    if (!user || !invite || !property) return;
    if (!fullName.trim()) {
      toast({ title: 'Required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upsert profile with name, phone, id number
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

      // 3. Mark invite as used
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

        {/* Auth gate — shown when not logged in */}
        {!user && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-4">{isSignUp ? 'Create an account' : 'Sign in to continue'}</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email address</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={handleAuth} disabled={authLoading} className="w-full">
                {authLoading ? 'Loading…' : 'Continue'}
              </Button>
              <button
                className="w-full text-center text-xs text-gray-500 hover:text-blue-600"
                onClick={() => setIsSignUp(s => !s)}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        )}

        {/* Details form — shown when logged in */}
        {user && (
          <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-blue-800 mb-1">Almost done — confirm your details</h3>
            <p className="text-xs text-gray-500 mb-4">This links you to the property</p>
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
