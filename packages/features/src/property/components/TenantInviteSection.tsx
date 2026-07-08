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
  /** When provided, the invite is locked to this property (no picker shown). */
  propertyId?: string;
  /** Explicit list of invitable (added/unlisted) properties for the picker. */
  properties?: InvitableProperty[];
}

interface InvitableProperty {
  id: string;
  title: string;
  location: string;
  price: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const phoneDigits = (v: string) => v.replace(/[^\d]/g, '');
// WhatsApp (wa.me) needs an international number with no leading 0 or +.
// Normalise common South African formats to 27XXXXXXXXX.
const toIntlPhone = (v: string) => {
  const d = phoneDigits(v);
  if (!d) return '';
  if (d.startsWith('27')) return d;
  if (d.startsWith('0')) return '27' + d.slice(1);
  if (d.length === 9) return '27' + d; // e.g. 821234567 (leading 0 omitted)
  return d;
};

export function TenantInviteSection({ propertyId: fixedPropertyId, properties: providedProperties }: TenantInviteSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [properties, setProperties] = useState<InvitableProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(fixedPropertyId || '');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [leaseStart, setLeaseStart] = useState(todayISO());
  const [leaseEnd, setLeaseEnd] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fixed-property mode: just pre-fill the rent from that property.
  useEffect(() => {
    if (!fixedPropertyId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('properties')
        .select('price')
        .eq('id', fixedPropertyId)
        .maybeSingle();
      if (active && data?.price && Number(data.price) > 0) setMonthlyRent(String(data.price));
    })();
    return () => { active = false; };
  }, [fixedPropertyId]);

  // Picker mode: use the caller-provided list when given (already filtered to
  // added/unlisted, not-yet-invited properties); otherwise load them here.
  useEffect(() => {
    if (fixedPropertyId) return;

    const applyList = (list: InvitableProperty[]) => {
      setProperties(list);
      if (list.length > 0) {
        setSelectedPropertyId(list[0].id);
        if (Number(list[0].price) > 0) setMonthlyRent(String(list[0].price));
      }
    };

    if (providedProperties) {
      applyList(providedProperties);
      return;
    }

    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title, location, price')
        .eq('landlord_id', user.id)
        .eq('is_listed', false)
        .order('created_at', { ascending: false });
      if (!active) return;
      applyList((data || []) as InvitableProperty[]);
    })();
    return () => { active = false; };
  }, [fixedPropertyId, providedProperties, user?.id]);

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    const p = properties.find(x => x.id === id);
    if (p && Number(p.price) > 0) setMonthlyRent(String(p.price));
  };

  const propertyIdToUse = fixedPropertyId || selectedPropertyId;

  const handleGenerate = async () => {
    if (!propertyIdToUse) {
      toast({ title: 'Select a property', description: 'Choose which added property this invite is for.', variant: 'destructive' });
      return;
    }
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
        .eq('property_id', propertyIdToUse)
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
          property_id: propertyIdToUse,
          landlord_id: user!.id,
          monthly_rent: Number(monthlyRent),
          lease_start: leaseStart || todayISO(),
          lease_end: leaseEnd || null,
          invitee_name: name.trim() || null,
        })
        .select('token')
        .single();
      if (error) throw error;
      // The join/registration page lives in the tenant app, not the landlord app.
      const tenantAppUrl =
        (import.meta as any).env?.VITE_TENANT_APP_URL || 'https://mzanzihomes-tenant.vercel.app';
      setGeneratedLink(`${tenantAppUrl}/join/${data.token}`);
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

  const shareWhatsApp = () => {
    const num = contact && !isEmail(contact) ? toIntlPhone(contact) : '';
    const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(inviteMessage())}`, '_blank');
  };

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

  // Picker mode with no added properties → nothing to invite to.
  if (!fixedPropertyId && properties.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        Add a property first — tenant invites are only for properties you've added, not publicly listed ones.
      </div>
    );
  }

  // ── Short form ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {!fixedPropertyId && (
        <div>
          <Label className="text-xs font-semibold mb-1 block">Property</Label>
          <select
            value={selectedPropertyId}
            onChange={e => handleSelectProperty(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.title || p.location}</option>
            ))}
          </select>
        </div>
      )}

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
