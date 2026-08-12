// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@mzanzihomes/ui/components/dialog';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';
import { documentTypeLabel } from '@mzanzihomes/common/constants/applicationConstants';
import { ArrowLeft, CheckCircle2, Download, FileText } from 'lucide-react';
import { mergeDraft } from '../application/types';
import { summaryGroups, type GroupStatus } from '../application/summary';
import { applicationStatusPresentation } from '../application/applicationPresentation';
import { withdrawApplication } from '../application/services/reviewService';

const ACTIVE_STATUSES = ['pending', 'submitted', 'pending_credit_check', 'more_info_requested'];

const STATUS_CHIP: Record<GroupStatus, { label: string; className: string }> = {
  complete: { label: 'Complete', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  missing: { label: 'Missing information', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  na: { label: 'Not applicable', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' }
};

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [applicantName, setApplicantName] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [legacyDetails, setLegacyDetails] = useState<any>(null);

  const [decision, setDecision] = useState<'accepted' | 'declined' | null>(null);
  const [approvedOpen, setApprovedOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const dashboard = isLandlord ? '/landlord/dashboard' : '/enhancedtenantdashboard';

  const load = useCallback(async () => {
    if (!id || !user) return;
    try {
      const { data: app, error } = await (supabase.from('applications') as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!app) {
        setApplication(null);
        return;
      }
      setApplication(app);

      const [propRes, profileRes, docsRes] = await Promise.all([
        (supabase.from('properties') as any)
          .select('id, title, location, price, images')
          .eq('id', app.property_id)
          .maybeSingle(),
        (supabase.from('profiles') as any)
          .select('display_name')
          .eq('user_id', app.tenant_id)
          .maybeSingle(),
        (supabase.from('documents') as any)
          .select('id, document_type, file_path, file_type, uploaded_at, application_id')
          .eq('user_id', app.tenant_id)
      ]);
      setProperty(propRes.data ?? null);
      setApplicantName(profileRes.data?.display_name ?? '');
      // Prefer documents linked to this application; legacy rows have no link
      const allDocs = docsRes.data ?? [];
      const linked = allDocs.filter((d: any) => d.application_id === app.id);
      setDocuments(linked.length > 0 ? linked : allDocs);

      if (!app.snapshot) {
        const { data: details } = await (supabase.from('screening_details') as any)
          .select('*')
          .eq('user_id', app.tenant_id)
          .maybeSingle();
        // Decrypt the (encrypted-at-rest) ID number for display.
        let legacy = details ?? null;
        if (legacy) {
          try {
            const { data: plainId } = await supabase.rpc('get_id_number', { p_user_id: app.tenant_id, p_source: 'screening' });
            if (plainId) legacy = { ...legacy, id_number: plainId as string };
          } catch { /* leave as-is */ }
        }
        setLegacyDetails(legacy);
      }
    } catch (error: any) {
      console.error('Error loading application', error);
      toast({ variant: 'destructive', title: 'Error loading application', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [id, user, toast]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    load();
  }, [user, load, navigate]);

  const downloadDocument = async (doc: any) => {
    try {
      let url: string | undefined;
      if (user?.id === application?.landlord_id) {
        const { data, error } = await supabase.functions.invoke('landlord-get-document-url', {
          body: { document_id: doc.id }
        });
        if (error || !data?.url) throw error ?? new Error('Could not get a download link');
        url = data.url;
      } else {
        const bucket = doc.document_type === 'id' || doc.document_type === 'proof_of_address'
          ? 'id-documents'
          : 'income-documents';
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(doc.file_path, 60);
        if (error || !data?.signedUrl) throw error ?? new Error('Could not get a download link');
        url = data.signedUrl;
      }
      await downloadFileFromUrl(url, doc.file_path.split('/').pop() || 'document');
    } catch (error: any) {
      console.error('Document download failed', error);
      toast({ variant: 'destructive', title: 'Download failed', description: 'Could not download the document. Please try again.' });
    }
  };

  const recordDecision = async () => {
    if (!decision || !application) return;
    const chosen = decision;
    setBusy(true);
    try {
      const { error } = await (supabase.from('applications') as any)
        .update({ status: chosen })
        .eq('id', application.id)
        .eq('landlord_id', user?.id);
      if (error) throw error;
      setDecision(null);
      // Redirect the landlord away from the review page. On approval, surface a
      // clear "generate a lease" prompt; on decline, a toast + straight to the
      // dashboard.
      if (chosen === 'accepted') {
        setApprovedOpen(true);
      } else {
        toast({ title: 'Application declined', description: 'The applicant has been notified.' });
        navigate(dashboard);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not record the decision', description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const startLease = () => {
    if (!application) return;
    navigate(`/lease/builder?tenantId=${application.tenant_id}&propertyId=${application.property_id}`);
  };

  const handleWithdraw = async () => {
    if (!application) return;
    setBusy(true);
    try {
      await withdrawApplication(application.id);
      setWithdrawOpen(false);
      toast({ title: 'Application withdrawn' });
      navigate(dashboard);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not withdraw', description: error.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Application not found</h2>
          <p className="text-muted-foreground mb-4">The application you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(dashboard)}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const viewerIsLandlord = user?.id === application.landlord_id;
  const presentation = applicationStatusPresentation(application.status);
  const active = ACTIVE_STATUSES.includes(application.status);
  const snapshotData = application.snapshot ? mergeDraft(application.snapshot) : null;
  const groups = snapshotData ? summaryGroups(snapshotData) : [];

  // Role-aware status line under the title, driven by the current workflow state.
  const statusMessage = viewerIsLandlord
    ? (active
        ? 'New application — review and decide'
        : application.status === 'accepted'
          ? 'Approved — generate a lease for this applicant'
          : application.status === 'declined'
            ? 'You declined this application'
            : presentation.label)
    : (active
        ? 'Application submitted — awaiting landlord review'
        : application.status === 'accepted'
          ? 'Application approved'
          : application.status === 'declined'
            ? 'Application not approved'
            : presentation.description);

  const decisionBanner =
    application.status === 'accepted'
      ? { title: 'Application approved', body: 'The landlord has approved this rental application.' }
      : application.status === 'declined'
        ? {
            title: 'Application not approved',
            body: 'The landlord has decided not to proceed with your rental application for this property.'
          }
        : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(dashboard))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {viewerIsLandlord ? `Application — ${applicantName || 'Applicant'}` : 'My rental application'}
            </h1>
            <Badge variant={presentation.badgeVariant} className={presentation.badgeClassName}>
              {presentation.label}
            </Badge>
          </div>
          <p className="text-sm font-medium text-primary">{statusMessage}</p>
          <p className="text-muted-foreground text-sm">
            {property?.title ? `${property.title} · ` : ''}
            Submitted {new Date(application.submitted_at || application.created_at).toLocaleDateString()} · Ref{' '}
            <span className="uppercase">{application.id.slice(0, 8)}</span>
          </p>
        </div>

        {!viewerIsLandlord && decisionBanner && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="font-semibold">{decisionBanner.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{decisionBanner.body}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {/* Submitted answers */}
          {groups.map((group) => {
            const chip = STATUS_CHIP[group.status];
            return (
              <Card key={group.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <Badge className={chip.className}>{chip.label}</Badge>
                  </div>
                </CardHeader>
                {group.rows.length > 0 && (
                  <CardContent className="space-y-1.5">
                    {group.rows.map((r, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="text-muted-foreground">{r.label}: </span>
                        <span className="break-words">{r.value}</span>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Historical applications submitted before snapshots existed */}
          {!snapshotData && legacyDetails && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Applicant details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {[
                  ['Name', legacyDetails.full_name],
                  ['ID number', legacyDetails.id_number],
                  ['Phone', legacyDetails.phone],
                  ['Employment', legacyDetails.employment_status],
                  ['Job title', legacyDetails.job_title],
                  ['Company', legacyDetails.company_name],
                  ['Net monthly income', legacyDetails.net_monthly_income && `R${Number(legacyDetails.net_monthly_income).toLocaleString()}`],
                  ['Current address', legacyDetails.current_address],
                  ['Previous landlord', legacyDetails.previous_landlord_name],
                  ['Previous landlord contact', legacyDetails.previous_landlord_contact]
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label as string}>
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="break-words">{value}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg text-sm">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{doc.file_path.split('/').pop()}</p>
                        <p className="text-xs text-muted-foreground">
                          {documentTypeLabel(doc.document_type)}
                          {doc.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0" onClick={() => downloadDocument(doc)}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Landlord decision */}
          {viewerIsLandlord && active && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your decision</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button onClick={() => setDecision('accepted')} disabled={busy}>
                  Approve application
                </Button>
                <Button variant="destructive" onClick={() => setDecision('declined')} disabled={busy}>
                  Decline application
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Landlord shortcut to lease creation once approved */}
          {viewerIsLandlord && application.status === 'accepted' && (
            <Card className="border-primary/30">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div>
                  <p className="font-semibold">Application approved — generate a lease now</p>
                  <p className="text-sm text-muted-foreground">
                    Create the lease for {applicantName || 'this applicant'} to get things moving.
                  </p>
                </div>
                <Button className="shrink-0" onClick={startLease}>Generate lease</Button>
              </CardContent>
            </Card>
          )}

          {/* Tenant withdrawal */}
          {!viewerIsLandlord && active && (
            <div className="text-center">
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setWithdrawOpen(true)}>
                Withdraw application
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Decision confirmation */}
      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision === 'accepted' ? 'Approve this application?' : 'Decline this application?'}
            </DialogTitle>
            <DialogDescription>
              {decision === 'accepted'
                ? 'The applicant will be notified that you approved their rental application. You can then generate a lease for them.'
                : 'The applicant will be notified that you decided not to proceed. This ends the application process.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDecision(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={decision === 'declined' ? 'destructive' : 'default'} onClick={recordDecision} disabled={busy}>
              {busy ? 'Saving…' : decision === 'accepted' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approved — generate a lease. Closing this returns to the dashboard. */}
      <Dialog open={approvedOpen} onOpenChange={(open) => { if (!open) navigate(dashboard); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">Application approved — generate a lease now</DialogTitle>
            <DialogDescription className="text-center">
              You've approved {applicantName || 'the applicant'}
              {property?.title ? ` for ${property.title}` : ''}. Start their lease to keep the momentum going.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="secondary" onClick={() => navigate(dashboard)}>
              Go to dashboard
            </Button>
            <Button onClick={startLease}>Generate lease</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw confirmation */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw your application?</DialogTitle>
            <DialogDescription>
              The landlord will be notified and will no longer consider your application for this
              property. You can apply again later if the property is still available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)} disabled={busy}>
              Keep my application
            </Button>
            <Button variant="destructive" onClick={handleWithdraw} disabled={busy}>
              {busy ? 'Withdrawing…' : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
