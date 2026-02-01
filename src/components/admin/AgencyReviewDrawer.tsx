// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CheckCircle, XCircle, RefreshCw, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AgencyStatus = 'draft' | 'submitted' | 'approved' | 'declined';

export type AdminAgencyListItem = {
  id: string;
  name: string;
  status: AgencyStatus;
  created_by: string;
  created_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  decline_reason?: string | null;
};

interface AgencyReviewDrawerProps {
  agency: AdminAgencyListItem;
  onReview: () => void;
  children: React.ReactNode;
}

export function AgencyReviewDrawer({ agency, onReview, children }: AgencyReviewDrawerProps) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [docUrl, setDocUrl] = useState<string>('');
  const { toast } = useToast();

  const statusLabel = useMemo(() => {
    if (agency.status === 'draft') return 'Draft';
    if (agency.status === 'submitted') return 'Submitted';
    if (agency.status === 'approved') return 'Approved';
    return 'Declined';
  }, [agency.status]);

  const loadPreviewUrl = async () => {
    if (!open) return;

    setLoading(true);
    try {
      const { data: docs, error: docsError } = await supabase
        .from('agency_documents')
        .select('file_path, doc_type, created_at')
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (docsError) throw docsError;

      const doc: any = docs?.[0];
      if (!doc?.file_path) {
        setDocUrl('');
        return;
      }

      const { data: signed } = await supabase.storage
        .from('agency-uploads')
        .createSignedUrl(doc.file_path, 60);

      setDocUrl(signed?.signedUrl || '');
    } catch (err: any) {
      setDocUrl('');
      toast({
        variant: 'destructive',
        title: 'Preview Error',
        description: err.message || 'Unable to load document preview',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadPreviewUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agency.id]);

  const refresh = () => {
    setDocUrl('');
    loadPreviewUrl();
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('agency-admin-approve', {
        body: { agency_id: agency.id },
      });

      if (error) throw new Error(error.message || 'Approval failed');

      toast({
        title: 'Agency Approved',
        description: 'Agency has been approved successfully.',
      });

      onReview();
      setOpen(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: err.message || 'Failed to approve agency',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason Required',
        description: 'Please provide a reason for declining.',
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('agency-admin-decline', {
        body: { agency_id: agency.id, reason: declineReason.trim() },
      });

      if (error) throw new Error(error.message || 'Decline failed');

      toast({
        title: 'Agency Declined',
        description: 'Agency has been declined successfully.',
      });

      onReview();
      setOpen(false);
      setDeclineReason('');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Decline Failed',
        description: err.message || 'Failed to decline agency',
      });
    } finally {
      setProcessing(false);
    }
  };

  const canReview = agency.status === 'submitted';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Agency Review</SheetTitle>
          <SheetDescription>Review agency submission and uploaded documents</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{agency.name}</span>
                <Badge variant={agency.status === 'approved' ? 'default' : agency.status === 'declined' ? 'destructive' : 'secondary'}>
                  {statusLabel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created: {agency.created_at ? new Date(agency.created_at).toLocaleString() : '-'}</span>
              </div>

              {agency.status === 'declined' && agency.decline_reason && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Decline reason: {agency.decline_reason}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading preview...</div>
              ) : docUrl ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Signed preview (60s)</div>
                  <a href={docUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                    Open document
                  </a>
                  <iframe title="Agency Document" src={docUrl} className="w-full h-96 rounded-md border" />
                </div>
              ) : (
                <Alert>
                  <AlertDescription>No document found for this agency.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Decline reason (required to decline)"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                disabled={processing || !canReview}
              />
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleApprove} disabled={processing || !canReview}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDecline} disabled={processing || !canReview}>
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>

            {!canReview && (
              <Alert>
                <AlertDescription>
                  This agency is not in a reviewable state. Only <b>submitted</b> agencies can be approved/declined.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
