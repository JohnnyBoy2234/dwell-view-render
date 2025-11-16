import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Flag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ReportPropertyModalProps {
  propertyId: string;
}

const ISSUE_TYPES = [
  { id: 'inappropriate_content', label: 'Inappropriate content or imagery' },
  { id: 'misleading_info', label: 'Misleading or inaccurate information' },
  { id: 'duplicate_listing', label: 'Duplicate listing on RentLekker' },
  { id: 'pricing_issue', label: 'Suspicious pricing or deposit requirements' },
  { id: 'scam_listing', label: 'Suspected scam or fake listing' },
  { id: 'other', label: 'Other concerns' },
];

export function ReportPropertyModal({ propertyId }: ReportPropertyModalProps) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [supportingLinks, setSupportingLinks] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedIssue = ISSUE_TYPES.find((issue) => issueType === issue.id);
  const issueGuidance: Record<string, string> = {
    inappropriate_content: 'Use this if the listing contains inappropriate language, photos, or violates RentLekker community guidelines.',
    misleading_info: 'Select this if the property details, amenities, or photos don’t match reality.',
    duplicate_listing: 'Use this when you’ve spotted the same property posted more than once.',
    pricing_issue: 'Choose this if the pricing, deposits, or payment requests appear suspicious.',
    scam_listing: 'Select this when you suspect fraudulent behaviour or a fake listing.',
    other: 'Please provide as much detail as possible so we can investigate.',
  };

  const resetForm = () => {
    setIssueType('');
    setDescription('');
    setReporterName('');
    setReporterEmail('');
    setSupportingLinks('');
    setAttachments([]);
  };

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const valid = files.filter((file) => file.size <= maxSize);
    if (valid.length !== files.length) {
      toast({
        title: 'Attachment too large',
        description: 'Each file must be 10MB or smaller.',
        variant: 'destructive',
      });
    }
    setAttachments(valid.slice(0, 3));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType) {
      toast({
        title: 'Select a reason',
        description: 'Please choose the closest reason for reporting this property.',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Add details',
        description: 'Please include a short explanation so our team can follow up.',
        variant: "destructive",
      });
      return;
    }

    if (!user && !reporterEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Add your email so RentLekker admins can contact you if needed.',
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedUrls: string[] = [];
      if (attachments.length > 0) {
        uploadedUrls = await Promise.all(
          attachments.map(async (file) => {
            const ext = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const { data, error } = await supabase.storage
              .from('property-report-attachments')
              .upload(fileName, file);
            if (error) throw error;
            const { data: publicUrl } = supabase.storage
              .from('property-report-attachments')
              .getPublicUrl(data.path);
            return publicUrl.publicUrl;
          })
        );
      }

      const reportData = {
        property_id: propertyId,
        issue_type: issueType,
        description: description.trim(),
        supporting_links: supportingLinks ? supportingLinks.trim() : null,
        attachments: uploadedUrls,
        reporter_name: reporterName ? reporterName.trim() : null,
        ...(user
          ? { reporter_id: user.id, reporter_email: user.email }
          : { reporter_email: reporterEmail.trim() }
        ),
      };

      const { error } = await (supabase
        .from('property_reports')
        .insert([reportData] as any) as any);

      if (error) throw error;

      // Create notification for admin
      if (user) {
        await (supabase
          .from('notifications')
          .insert([{
            user_id: user.id,
            type: 'property_report',
            message: `Property report submitted: ${selectedIssue?.label || 'New report'}`,
            metadata: {
              property_id: propertyId,
              issue_type: issueType,
              reporter_email: user.email || reporterEmail.trim(),
            },
          }] as any) as any);
      }

      toast({
        title: "Report Submitted",
        description: "Thank you for your report. Our team will review it shortly.",
      });

      // Reset form and close modal
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="text-sm text-ocean-blue-light hover:text-ocean-blue transition-colors cursor-pointer underline-offset-4 hover:underline"
        >
          report property
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Property</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>What's the issue?</Label>
            <RadioGroup 
              value={issueType} 
              onValueChange={setIssueType}
              className="space-y-2"
            >
              {ISSUE_TYPES.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.id} id={type.id} />
                  <Label 
                    htmlFor={type.id} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Do not include passwords or payment details.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportingLinks">Links (optional)</Label>
            <Input
              id="supportingLinks"
              placeholder="Include any links or references"
              value={supportingLinks}
              onChange={(e) => setSupportingLinks(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (optional)</Label>
            <Input
              id="attachments"
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFilesChange}
            />
            {attachments.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1">
                {attachments.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="reporterName">Your Name</Label>
                <Input
                  id="reporterName"
                  placeholder="Optional"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporterEmail">Email</Label>
                <Input
                  id="reporterEmail"
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !issueType || !description.trim()}
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}