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
  { id: 'inappropriate_content', label: 'Inappropriate Content' },
  { id: 'misleading_info', label: 'Misleading Information' },
  { id: 'duplicate_listing', label: 'Duplicate Listing' },
  { id: 'pricing_issue', label: 'Pricing Issue' },
  { id: 'fake_listing', label: 'Fake Listing' },
  { id: 'other', label: 'Other' },
];

export function ReportPropertyModal({ propertyId }: ReportPropertyModalProps) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an issue type and provide a description.",
        variant: "destructive",
      });
      return;
    }

    if (!user && !email.trim()) {
      toast({
        title: "Email Required",
        description: "Please provide your email address to submit a report.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData = {
        property_id: propertyId,
        issue_type: issueType,
        description: description.trim(),
        ...(user ? { reporter_id: user.id } : { reporter_email: email.trim() }),
      };

      const { error } = await supabase
        .from('property_reports')
        .insert([reportData]);

      if (error) throw error;

      toast({
        title: "Report Submitted",
        description: "Thank you for your report. Our team will review it shortly.",
      });

      // Reset form and close modal
      setIssueType('');
      setDescription('');
      setEmail('');
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
              rows={3}
            />
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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