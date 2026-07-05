// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { Copy, MessageSquare, Mail, Sparkles } from 'lucide-react';

interface TenantInviteSectionProps {
  propertyId: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const phoneDigits = (v: string) => v.replace(/[^\d]/g, '');

export function TenantInviteSection({ propertyId }: TenantInviteSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [leaseStart, setLeaseStart] = useState(todayISO());
  const [leaseEnd, setLeaseEnd] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Pre-fill monthly rent from the property's listed price.
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
    if (!name.trim()) {
      toast({ title: 'Tenant name required', description: 'Enter the tenant’s name.', variant: 'destructive' });
      return;
    }
    if (!monthlyRent || Number(monthlyRent) <= 0) {
      toast({ title: 'Add the monthly rent', description: 'Enter the monthly rent to create the invite.', variant: 'destructive' });
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

  const inviteMessage = () =>
    `Hi${name.trim() ? ' ' + name.trim() : ''}, you've been invited to join your rental on MzanziHomes. Register here: ${generatedLink}`;

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard.' });
  };

  // If a phone number was captured, send the WhatsApp message straight to them.
  const shareWhatsApp = () => {
    const num = contact && !isEmail(contact) ? phoneDigits(contact) : '';
    const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(inviteMessage())}`, '_blank');
  };

  // If an email was captured, pre-address the email to them.
  const shareEmail = () => {
    const to = contact && isEmail(contact) ? contact.trim() : '';
    const subject = encodeURIComponent('Your MzanziHomes tenant invite');
    window.open(`mailto:${to}?subject=${subject}&body=${encodeURIComponent(inviteMessage())}`);
  };

  const reset = () => {
    setGeneratedLink('');
    setLeaseEnd('');
    setLeaseStart(todayISO());
  };

  // ── Link ready — share it ──────────────────────────────────────────────
  if (generatedLink) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-green-700">
          ✓ Invite ready{name.trim() ? ` for ${name.trim()}` : ''} — share it
        </div>
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
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
          Invite someone else
        </button>
      </div>
    );
  }

  // ── Short form ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold text-gray-800">Invite your tenant</div>
        <div className="text-sm text-gray-500">A few details, then share the registration link.</div>
      </div>

      <div>
        <Label className="text-xs font-semibold mb-1 block">Tenant name</Label>
        <Input placeholder="e.g. Thabo Mokoena" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div>
        <Label className="text-xs font-semibold mb-1 block">Email or phone (optional)</Label>
        <Input placeholder="thabo@email.com or 082 123 4567" value={contact} onChange={e => setContact(e.target.value)} />
      </div>

      <div>
        <Label className="text-xs font-semibold mb-1 block">Monthly Rent (R)</Label>
        <Input type="number" placeholder="12500" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} />
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

      <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
        <Sparkles className="h-4 w-4 mr-2" />
        {isGenerating ? 'Generating…' : 'Generate Invite Link'}
      </Button>
    </div>
  );
}
