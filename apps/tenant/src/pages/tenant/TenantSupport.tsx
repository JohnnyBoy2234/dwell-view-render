import React, { useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { LifeBuoy, Send } from 'lucide-react';
import { useSupportMessages } from '@mzanzihomes/features/support';
import TileDetailLayout from '@/components/TileDetailLayout';

const CATEGORIES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'property', label: 'Property / Application' },
  { value: 'billing', label: 'Payments' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function TenantSupport() {
  const { toast } = useToast();
  const { createMessage, messages } = useSupportMessages();

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({ title: 'Please fill in all fields', description: 'Subject and message are required.', variant: 'destructive' });
      return;
    }
    try {
      await createMessage({
        subject: formData.subject,
        message: formData.message,
        category: formData.category as any,
        priority: formData.priority as any,
      });
      toast({ title: 'Message sent!', description: "Our support team will get back to you soon." });
      setFormData({ subject: '', message: '', category: 'general', priority: 'medium' });
    } catch (error) {
      console.error('Error submitting support request:', error);
      toast({ title: 'Error', description: 'Failed to send message. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <TileDetailLayout title="Support" subtitle="We're here to help" icon={LifeBuoy} accent="#2563EB">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Contact Support</CardTitle>
            <CardDescription>Send us a message and we'll get back to you as soon as possible.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  placeholder="Brief description of your issue"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Please describe your issue in detail..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="gap-2">
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {messages.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Previous Messages</CardTitle>
              <CardDescription>Your recent support requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-medium text-sm">{msg.subject}</h4>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(msg.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                    {msg.admin_response && (
                      <div className="mt-3 p-3 bg-muted/20 rounded-md">
                        <p className="text-sm font-medium mb-1">Support Response:</p>
                        <p className="text-sm">{msg.admin_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Email: support@mzanzihomes.com</p>
            <p>Hours: Mon–Fri 8:00–20:00, Sat 9:00–17:00 SAST</p>
          </CardContent>
        </Card>
      </div>
    </TileDetailLayout>
  );
}
