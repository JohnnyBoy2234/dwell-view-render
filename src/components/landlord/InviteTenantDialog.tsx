// @ts-nocheck
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Copy, Share2, Check, Loader2 } from 'lucide-react';

interface InviteTenantDialogProps {
  propertyId: string;
  propertyTitle: string;
  trigger?: React.ReactNode;
}

export function InviteTenantDialog({ propertyId, propertyTitle, trigger }: InviteTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tenantEmail, setTenantEmail] = useState('');
  const { toast } = useToast();

  const generateInviteLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ variant: 'destructive', title: 'Not authenticated', description: 'Please log in first.' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-tenant-invite', {
        body: { property_id: propertyId, tenant_email: tenantEmail || undefined },
      });

      if (error) throw error;

      setInviteUrl(data.invite_url);
      toast({ title: 'Invite link created!', description: 'Share this link with your tenant.' });
    } catch (error: any) {
      console.error('Error creating invite:', error);
      toast({ variant: 'destructive', title: 'Failed to create invite', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Invite link copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to copy' });
    }
  };

  const shareViaWhatsApp = () => {
    if (!inviteUrl) return;
    const message = `You've been invited to join ${propertyTitle} on RentLekker. Click here to sign up and get started: ${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setInviteUrl(null);
      setCopied(false);
      setTenantEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-ocean-blue hover:bg-ocean-blue/90 text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Tenant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Tenant</DialogTitle>
          <DialogDescription>
            Generate a link to invite your tenant to {propertyTitle}. When they sign up through this link, they'll be automatically connected to your property.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!inviteUrl ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="tenant-email">Tenant's Email (optional)</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  placeholder="tenant@example.com"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If you know their email, enter it here. Otherwise, just share the link.
                </p>
              </div>
              <Button onClick={generateInviteLink} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Generate Invite Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly className="text-sm" />
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button onClick={shareViaWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <Share2 className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                When your tenant clicks this link and signs up, they'll automatically be connected to your property.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}