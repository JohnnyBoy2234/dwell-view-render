// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Skeleton } from '@mzanzihomes/ui/components/skeleton';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useSubscription } from '@mzanzihomes/supabase/hooks/useSubscription';
import { supabase } from '@mzanzihomes/supabase/client';
import {
  Building2, FileSignature, Receipt, BarChart3, Wrench, Users,
  FolderLock, ShieldAlert, Loader2, CheckCircle2,
} from 'lucide-react';

const SUBSCRIPTION_INCLUDES = [
  { icon: Building2, label: 'Unlimited property listings' },
  { icon: Users, label: 'Tenant applications & screening' },
  { icon: FileSignature, label: 'Digital lease signing' },
  { icon: Receipt, label: 'Rent collection, invoices & receipts' },
  { icon: BarChart3, label: 'SwiftBooks accounting & tax tools' },
  { icon: Wrench, label: 'Maintenance & inspection tracking' },
];

const STORED_RECORDS = [
  'Signed lease agreements',
  'Rent invoices & payment receipts',
  'Tenant records & applications',
  'SwiftBooks transaction history',
  'Inspection & inventory reports',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// Landlord "Billing & Subscription" panel opened from the avatar menu.
// Cancelling is framed as closing your Digital Property Office, with the
// POPIA retention consequences spelled out before the final confirmation.
export function BillingSubscriptionDialog({ open, onOpenChange }: Props) {
  const { isSubscriber, planStatus, planExpiresAt, loading, refresh } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const nonRenewing = planStatus === 'non-renewing';
  const expiryDate = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleCloseOffice = async () => {
    setClosing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', { body: {} });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error || error.message);
      }
      if (data && data.success === false) throw new Error(data.error || 'Could not cancel subscription');
      await refresh();
      setConfirmOpen(false);
      onOpenChange(false);
      toast({
        title: 'Your Digital Property Office is closing',
        description: expiryDate
          ? `You won't be billed again. Access continues until ${expiryDate}.`
          : "You won't be billed again.",
      });
    } catch (e) {
      toast({ title: 'Could not close your office', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Billing &amp; Subscription</DialogTitle>
            <DialogDescription>Your MzanziHomes Digital Property Office</DialogDescription>
          </DialogHeader>

          {loading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {isSubscriber ? 'Landlord Subscription' : 'Free plan'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isSubscriber
                      ? nonRenewing
                        ? expiryDate ? `Cancelled — access until ${expiryDate}` : 'Cancelled — will not renew'
                        : expiryDate ? `Renews on ${expiryDate}` : 'Billed monthly'
                      : 'Subscribe to unlock your full Digital Property Office'}
                  </p>
                </div>
                <Badge className={isSubscriber
                  ? nonRenewing
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-green-100 text-green-700 border-green-200'
                  : ''}
                  variant={isSubscriber ? 'default' : 'secondary'}>
                  {isSubscriber ? (nonRenewing ? 'Ending' : 'Active') : 'Free'}
                </Badge>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {isSubscriber ? 'Your subscription includes' : 'A subscription includes'}
                </p>
                <ul className="space-y-1.5">
                  {SUBSCRIPTION_INCLUDES.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2.5 text-sm">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: 'hsl(214,100%,59%)' }} />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isSubscriber ? (
                !nonRenewing && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                    onClick={() => setConfirmOpen(true)}
                  >
                    Close Your Digital Property Office
                  </Button>
                )
              ) : (
                <Button
                  className="w-full rounded-xl"
                  style={{ background: 'hsl(214,100%,59%)', color: '#fff' }}
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/landlord/dashboard/profile');
                  }}
                >
                  Subscribe
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!closing) setConfirmOpen(v); }}>
        <DialogContent className="max-w-md rounded-2xl max-h-[85dvh] overflow-y-auto border-2 border-red-500">
          <DialogHeader>
            <DialogTitle>Close Your Digital Property Office?</DialogTitle>
            <DialogDescription>
              Please read carefully — this affects the records stored in your office.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="flex items-center gap-2 font-medium mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Your subscription includes
              </p>
              <ul className="list-disc pl-9 space-y-0.5 text-muted-foreground">
                {SUBSCRIPTION_INCLUDES.map(({ label }) => <li key={label}>{label}</li>)}
              </ul>
            </div>

            <div>
              <p className="flex items-center gap-2 font-medium mb-1.5">
                <FolderLock className="w-4 h-4 text-indigo-600" /> Records stored in your office
              </p>
              <ul className="list-disc pl-9 space-y-0.5 text-muted-foreground">
                {STORED_RECORDS.map(r => <li key={r}>{r}</li>)}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="flex items-center gap-2 font-medium text-amber-800">
                <ShieldAlert className="w-4 h-4 shrink-0" /> POPIA &amp; your records
              </p>
              <p className="text-amber-800/90">
                Once your office is closed and there is no longer a lawful reason to keep your
                personal information, the Protection of Personal Information Act (POPIA) prevents
                MzanziHomes from retaining it indefinitely.
              </p>
              <p className="text-amber-800/90">
                After the retention period your records will be permanently deleted and you will
                lose access to them. Download anything you need before closing your office.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={closing}
              onClick={() => setConfirmOpen(false)}
            >
              Keep my office
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              disabled={closing}
              onClick={handleCloseOffice}
            >
              {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Close my office'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
