import { useState, useEffect } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { Copy, MessageSquare, Mail, ChevronDown, Sparkles } from 'lucide-react';

interface TenantInviteSectionProps {
  propertyId: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function TenantInviteSection({ propertyId }: TenantInviteSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [monthlyRent, setMonthlyRent] = useState('');
  const [leaseStart, setLeaseStart] = useState(todayISO());
  const [leaseEnd, setLeaseEnd] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Pre-fill the monthly rent from the property's listed price so, in the common
  // case, inviting a tenant is a single tap — no form to fill in first.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('properties')
        .select('price')
        .eq('id', propertyId)
        .maybeSingle();
      if (active && data?.price && Number(data.price) > 0) {
        setMonthlyRent(String(data.price));
      }
    })();
    return () => { active = false; };
  }, [propertyId]);

  const handleGenerate = async () => {
    if (!monthlyRent || Number(monthlyRent) <= 0) {
      setShowTerms(true);
      toast({ title: 'Add the monthly rent', description: 'Enter the monthly rent to create the invite link.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const { data: existingTenancy } = await supabase
        .from('tenancies')
        .select('id')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingTenancy) {
        toast({ title: 'Already has a tenant', description: 'This property already has an active tenant.', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      const { data, error } = await supabase
        .from('property_invites')
        .insert({
          property_id: propertyId,
          landlord_id: user!.id,
          monthly_rent: Number(monthlyRent),
          lease_start: leaseStart || todayISO(),
          lease_end: leaseEnd || null,
        })
        .select('token')
        .single();
      if (error) throw error;
      setGeneratedLink(`${window.location.origin}/join/${data.token}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`You've been invited to join a property on MzanziHomes. Click here to register: ${generatedLink}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Your Tenant Registration Link');
    const body = encodeURIComponent(`Hi,\n\nYou've been invited to register as a tenant. Click the link below to get started:\n\n${generatedLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const resetForAnother = () => {
    setGeneratedLink('');
    setLeaseEnd('');
    setLeaseStart(todayISO());
  };

  // ── Link ready — share it ──────────────────────────────────────────────
  if (generatedLink) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-green-700">✓ Invite link ready to share</div>
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 break-all">
          {generatedLink}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-[#25d366] hover:bg-[#1ebe5d] text-white text-xs" onClick={shareWhatsApp}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={shareEmail}>
            <Mail className="h-3.5 w-3.5 mr-1" /> Email
          </Button>
        </div>
        <button onClick={resetForAnother} className="text-xs text-gray-400 hover:text-gray-600">
          Create another link
        </button>
      </div>
    );
  }

  // ── Fast path: one tap to generate (rent pre-filled from the listing) ───
  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold text-gray-800">Invite your tenant</div>
        <div className="text-sm text-gray-500">
          {monthlyRent
            ? `We'll use the listed rent of R${Number(monthlyRent).toLocaleString()}/mo. Tap below to get a shareable link.`
            : 'Enter the monthly rent, then share the registration link.'}
        </div>
      </div>

      {/* Lease terms — collapsed by default; pre-filled so most invites are one tap */}
      <button
        type="button"
        onClick={() => setShowTerms(s => !s)}
        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTerms ? 'rotate-180' : ''}`} />
        {showTerms ? 'Hide lease terms' : 'Edit lease terms (optional)'}
      </button>

      {(showTerms || !monthlyRent) && (
        <div className="space-y-3 rounded-xl bg-gray-50 p-3">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Monthly Rent (R)</Label>
            <Input
              type="number"
              placeholder="12500"
              value={monthlyRent}
              onChange={e => setMonthlyRent(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Start Date</Label>
              <Input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">End Date (optional)</Label>
              <Input type="date" value={leaseEnd} onChange={e => setLeaseEnd(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
        <Sparkles className="h-4 w-4 mr-2" />
        {isGenerating ? 'Generating…' : 'Generate Invite Link'}
      </Button>
    </div>
  );
}
