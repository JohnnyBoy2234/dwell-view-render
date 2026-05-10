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

  // Step 1: email entry
  const [email, setEmail] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  // Step 2: OTP verification
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3: tenant details
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // A valid tenant session = logged in AND not the landlord
  // Must be computed before any useEffect that references it
  const isTenantSession = !!(user && invite && user.id !== invite.landlord_id);

  useEffect(() => {
    loadInvite();
  }, [token]);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // If the landlord is logged in, sign them out so the tenant can sign in
  useEffect(() => {
    if (user && invite && user.id === invite.landlord_id) {
      supabase.auth.signOut();
      toast({
        title: 'Logged out',
        description: 'Please enter your email to accept this invite as a tenant.',
      });
    }
  }, [user?.id, invite?.landlord_id]);

  // Pre-fill name from email once the tenant session is established
  useEffect(() => {
    if (isTenantSession && email && !fullName) {
      setFullName(email.split('@')[0].replace(/[._-]/g, ' '));
    }
  }, [isTenantSession]);

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

  // Send OTP via signInWithOtp — works for both new and existing users,
  // and always delivers a 6-digit code (not a link).
  const handleSendCode = async () => {
    if (!email) {
      toast({ title: 'Required', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }
    setSendingCode(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      toast({ title: 'Failed to send code', description: error.message, variant: 'destructive' });
    } else {
      setShowOtpStep(true);
      setResendCooldown(60);
    }
    setSendingCode(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: 'Required', description: 'Enter the 6-digit code from your email.', variant: 'destructive' });
      return;
    }
    setVerifyLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    });
    if (error) {
      toast({ title: 'Invalid code', description: error.message, variant: 'destructive' });
    }
    // On success the auth listener updates `user` → isTenantSession becomes true
    setVerifyLoading(false);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      toast({ title: 'Failed to resend', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Code resent', description: 'Check your inbox for a new 6-digit code.' });
      setResendCooldown(60);
    }
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

      // 4. Create conversation between tenant and landlord if one doesn't exist
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('property_id', invite.property_id)
        .eq('landlord_id', invite.landlord_id)
        .eq('tenant_id', user.id)
        .maybeSingle();

      if (!existingConvo) {
        await supabase.from('conversations').insert({
          property_id: invite.property_id,
          landlord_id: invite.landlord_id,
          tenant_id: user.id,
          status: 'active',
        });
      }

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

        {/* Step 1: Email entry */}
        {!isTenantSession && !showOtpStep && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-1">Verify your email to continue</h3>
            <p className="text-xs text-gray-500 mb-4">
              We'll send a 6-digit code to your email. Works for both new and existing accounts.
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
                  onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                  autoFocus
                />
              </div>
              <Button onClick={handleSendCode} disabled={sendingCode} className="w-full">
                {sendingCode ? 'Sending…' : 'Send Verification Code'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: OTP verification */}
        {!isTenantSession && showOtpStep && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">📧</div>
              <h3 className="font-bold text-sm text-gray-900">Check your email</h3>
              <p className="text-xs text-gray-500 mt-1">
                We sent a 6-digit code to
              </p>
              <p className="text-xs font-semibold text-blue-700 mt-0.5">{email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-center block mb-2">Verification code</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl font-bold tracking-[0.5em] h-14"
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={verifyLoading || otpCode.length !== 6}
                className="w-full"
              >
                {verifyLoading ? 'Verifying…' : 'Verify & Continue'}
              </Button>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0}
                  className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
                <button
                  onClick={() => { setShowOtpStep(false); setOtpCode(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Use a different email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Details form */}
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
