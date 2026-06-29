import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Input } from '@mzanzihomes/ui/components/input';
import { RadioGroup, RadioGroupItem } from '@mzanzihomes/ui/components/radio-group';
import { Loader2 } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

interface ReportPropertyModalProps {
  propertyId: string;
}

const ISSUE_TYPES = [
  { id: 'inappropriate_content', label: 'Inappropriate content or imagery' },
  { id: 'misleading_info',       label: 'Misleading or inaccurate information' },
  { id: 'duplicate_listing',     label: 'Duplicate listing' },
  { id: 'pricing_issue',         label: 'Suspicious pricing or deposit' },
  { id: 'scam_listing',          label: 'Suspected scam or fake listing' },
  { id: 'other',                 label: 'Other concerns' },
];

export function ReportPropertyModal({ propertyId }: ReportPropertyModalProps) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setIssueType('');
    setDescription('');
    setReporterEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueType) {
      toast({ title: 'Select a reason', description: 'Please choose a reason for reporting.', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Add details', description: 'Please describe the issue so our team can follow up.', variant: 'destructive' });
      return;
    }
    if (!user && !reporterEmail.trim()) {
      toast({ title: 'Email required', description: 'Add your email so we can contact you if needed.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const reportData: Record<string, any> = {
        property_id: propertyId,
        issue_type: issueType,
        description: description.trim(),
      };

      if (user) {
        reportData.reporter_id = user.id;
        reportData.reporter_email = user.email;
      } else {
        reportData.reporter_email = reporterEmail.trim();
      }

      const { error } = await (supabase.from('property_reports').insert([reportData]) as any);
      if (error) throw error;

      toast({ title: 'Report Submitted', description: 'Thank you. Our team will review it shortly.' });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      console.error('Report submission error:', err);
      toast({ title: 'Submission Failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-4 hover:underline">
          Report this listing
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-5">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-base">Report this listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Issue type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">What's the issue?</Label>
            <RadioGroup value={issueType} onValueChange={setIssueType} className="space-y-1.5">
              {ISSUE_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    issueType === type.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <RadioGroupItem value={type.id} id={type.id} />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="report-description" className="text-sm font-medium">Details</Label>
            <Textarea
              id="report-description"
              placeholder="Describe the issue so our team can investigate…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Don't include passwords or payment details.</p>
          </div>

          {/* Email for unauthenticated users */}
          {!user && (
            <div className="space-y-1.5">
              <Label htmlFor="reporter-email" className="text-sm font-medium">Your email</Label>
              <Input
                id="reporter-email"
                type="email"
                placeholder="you@example.com"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !issueType || !description.trim()}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
