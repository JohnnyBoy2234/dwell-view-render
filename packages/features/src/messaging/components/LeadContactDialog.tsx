import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Input } from '@mzanzihomes/ui/components/input';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

interface LeadContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle?: string;
}

export function LeadContactDialog({ open, onOpenChange, propertyId, propertyTitle }: LeadContactDialogProps) {
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('submit-property-lead', {
        body: { property_id: propertyId, message: message.trim() || undefined, phone: phone.trim() || undefined },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || 'Could not send your enquiry');
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Could not send your enquiry');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <h2 className="font-bold text-lg mb-1">Enquiry sent!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The landlord has your details and will contact you directly.
            </p>
            <Button className="w-full rounded-xl" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>I'm interested</DialogTitle>
              <DialogDescription>
                {propertyTitle ? `Send your details to the landlord of ${propertyTitle}.` : 'Send your details to the landlord.'}{' '}
                They'll contact you directly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Phone number (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
              <Textarea
                placeholder="Add a short message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <Button className="w-full rounded-xl" disabled={sending} onClick={submit}>
                {sending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4 mr-2" /> Send my details</>}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
