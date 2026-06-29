import { useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupportTicketFormProps {
  /** Pre-populate the message field (e.g. conversation summary) */
  prefillMessage?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function SupportTicketForm({
  prefillMessage = '',
  onSubmit,
  onCancel,
}: SupportTicketFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState(
    user?.user_metadata?.display_name || ''
  );
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState(prefillMessage);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          subject: 'Support request via AI chat',
          message: `Name: ${name}\nEmail: ${email}\n\n${message}`,
          category: 'general' as const,
          priority: 'medium' as const,
          user_id: user.id,
        } as any);

      if (error) throw error;

      toast.success("Support ticket submitted. We'll get back to you soon.");
      onSubmit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-center">
        <p className="text-sm text-muted-foreground">
          <a href="/auth" className="underline text-foreground hover:text-primary">Sign in</a>
          {' '}to submit a support ticket.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-muted/40 rounded-xl border border-border/50">
      <p className="text-sm font-medium text-foreground">Send us a message</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="ticket-name" className="text-xs text-muted-foreground">Name</Label>
          <Input
            id="ticket-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="ticket-email" className="text-xs text-muted-foreground">Email</Label>
          <Input
            id="ticket-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ticket-message" className="text-xs text-muted-foreground">Message</Label>
        <Textarea
          id="ticket-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue..."
          className="text-sm resize-none"
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !message.trim()}
          className="gap-1"
        >
          {submitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Send
        </Button>
      </div>
    </form>
  );
}
