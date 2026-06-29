import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { Link as LinkIcon, Copy, MessageSquare, Mail } from 'lucide-react';

interface TenantInviteSectionProps {
  propertyId: string;
}

export function TenantInviteSection({ propertyId }: TenantInviteSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!monthlyRent || !leaseStart) {
      toast({ title: 'Required', description: 'Monthly rent and start date are required.', variant: 'destructive' });
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
          lease_start: leaseStart,
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

  if (!showForm) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">👤</div>
        <div className="font-semibold text-gray-800 mb-1">No tenants yet</div>
        <div className="text-sm text-gray-500 mb-4">Invite your existing tenant to connect to this property</div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <LinkIcon className="h-4 w-4 mr-2" /> Generate Tenant Invite Link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-blue-800">Set up invite link</h3>
        <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

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

      {!generatedLink ? (
        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
          {isGenerating ? 'Generating…' : 'Generate Link'}
        </Button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-green-700">✓ Link ready to share</div>
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
        </div>
      )}
    </div>
  );
}
