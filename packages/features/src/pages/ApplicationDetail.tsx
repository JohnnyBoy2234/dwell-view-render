// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@mzanzihomes/ui/components/dialog';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';
import { documentTypeLabel } from '@mzanzihomes/common/constants/applicationConstants';
import { ArrowLeft, Download, FileText, History, ShieldCheck, ShieldOff } from 'lucide-react';
import { mergeDraft } from '../application/types';
import { summaryGroups, type GroupStatus } from '../application/summary';
import { applicationStatusPresentation } from '../application/applicationPresentation';
import {
  addNote, createInfoRequest, getConsentRecord, listEvents, listInfoRequests, listNotes,
  respondToInfoRequest, withdrawApplication,
  type ApplicationEvent, type ApplicationNote, type ConsentRecord, type InfoRequest
} from '../application/services/reviewService';

const ACTIVE_STATUSES = ['pending', 'submitted', 'pending_credit_check', 'more_info_requested'];

const STATUS_CHIP: Record<GroupStatus, { label: string; className: string }> = {
  complete: { label: 'Complete', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  missing: { label: 'Missing information', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  na: { label: 'Not applicable', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' }
};

const REQUEST_ITEM_SUGGESTIONS = [
  'Missing document',
  'Clearer copy of a document',
  'Updated bank statement',
  'Updated credit report',
  'Income explanation',
  'Reference information',
  'Guarantor information',
  'Correction to your details',
  'Explanation of an answer'
];

const EVENT_LABELS: Record<string, string> = {
  submitted: 'Application submitted',
  status_changed: 'Status changed',
  info_requested: 'More information requested',
  info_response: 'Applicant responded to a request'
};

const shortDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function eventDescription(e: ApplicationEvent): string {
  if (e.event_type === 'status_changed' && e.detail?.from && e.detail?.to) {
    return `Status changed from ${String(e.detail.from).replace(/_/g, ' ')} to ${String(e.detail.to).replace(/_/g, ' ')}`;
  }
  if ((e.event_type === 'info_requested' || e.event_type === 'info_response') && e.detail?.item) {
    return `${EVENT_LABELS[e.event_type]}: ${e.detail.item}`;
  }
  return EVENT_LABELS[e.event_type] || e.event_type.replace(/_/g, ' ');
}

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
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [infoRequests, setInfoRequests] = useState<InfoRequest[]>([]);
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [legacyDetails, setLegacyDetails] = useState<any>(null);

  const [decision, setDecision] = useState<'accepted' | 'declined' | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestItem, setRequestItem] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestDue, setRequestDue] = useState('');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const dashboard = isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';

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

      const [propRes, profileRes, docsRes, consentRes, requestsRes, eventsRes] = await Promise.all([
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
          .eq('user_id', app.tenant_id),
        getConsentRecord(app.id),
        listInfoRequests(app.id),
        listEvents(app.id)
      ]);
      setProperty(propRes.data ?? null);
      setApplicantName(profileRes.data?.display_name ?? '');
      // Prefer documents linked to this application; legacy rows have no link
      const allDocs = docsRes.data ?? [];
      const linked = allDocs.filter((d: any) => d.application_id === app.id);
      setDocuments(linked.length > 0 ? linked : allDocs);
      setConsent(consentRes);
      setInfoRequests(requestsRes);
      setEvents(eventsRes);

      if (!app.snapshot) {
        const { data: details } = await (supabase.from('screening_details') as any)
          .select('*')
          .eq('user_id', app.tenant_id)
          .maybeSingle();
        setLegacyDetails(details ?? null);
      }

      if (user.id === app.landlord_id) {
        setNotes(await listNotes(app.id));
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
    setBusy(true);
    try {
      const { error } = await (supabase.from('applications') as any)
        .update({ status: decision })
        .eq('id', application.id)
        .eq('landlord_id', user?.id);
      if (error) throw error;
      setDecision(null);
      await load();
      toast({
        title: decision === 'accepted' ? 'Application approved' : 'Application declined',
        description: 'The applicant has been notified.'
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not record the decision', description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const sendInfoRequest = async () => {
    if (!application || !requestItem.trim()) return;
    setBusy(true);
    try {
      await createInfoRequest({
        applicationId: application.id,
        landlordId: application.landlord_id,
        tenantId: application.tenant_id,
        item: requestItem.trim(),
        message: requestMessage.trim() || undefined,
        dueDate: requestDue || undefined
      });
      setRequestOpen(false);
      setRequestItem('');
      setRequestMessage('');
      setRequestDue('');
      await load();
      toast({ title: 'Request sent', description: 'The applicant has been asked for more information.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not send the request', description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const submitResponse = async (request: InfoRequest) => {
    const response = (responses[request.id] || '').trim();
    if (!response) {
      toast({ variant: 'destructive', title: 'Please write a response first' });
      return;
    }
    setBusy(true);
    try {
      await respondToInfoRequest(request, response);
      await load();
      toast({ title: 'Response sent', description: 'The landlord has been notified.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not send your response', description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;
    setBusy(true);
    try {
      await withdrawApplication(application.id);
      setWithdrawOpen(false);
      await load();
      toast({ title: 'Application withdrawn' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not withdraw', description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!application || !newNote.trim()) return;
    setBusy(true);
    try {
      const note = await addNote(application.id, application.landlord_id, newNote.trim());
      setNotes((prev) => [note, ...prev]);
      setNewNote('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not save the note', description: error.message });
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
  const openRequests = infoRequests.filter((r) => r.status === 'open');

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

        {/* Open information requests */}
        {infoRequests.length > 0 && (
          <Card className="mb-6 border-amber-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Information requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {infoRequests.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{r.item}</p>
                    <Badge
                      className={
                        r.status === 'open'
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                          : 'bg-green-100 text-green-800 hover:bg-green-100'
                      }
                    >
                      {r.status === 'open' ? 'Waiting for response' : 'Responded'}
                    </Badge>
                  </div>
                  {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
                  {r.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Requested by {new Date(r.due_date).toLocaleDateString()}
                    </p>
                  )}
                  {r.response && (
                    <div className="rounded bg-muted p-2 text-sm">
                      <span className="text-muted-foreground">Response: </span>
                      {r.response}
                    </div>
                  )}
                  {!viewerIsLandlord && r.status === 'open' && (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor={`response_${r.id}`} className="text-xs">
                        Your response
                      </Label>
                      <Textarea
                        id={`response_${r.id}`}
                        value={responses[r.id] || ''}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <Button size="sm" disabled={busy} onClick={() => submitResponse(r)}>
                        Send response
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {/* Consent status — always explicit, never assumed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Screening consent</CardTitle>
            </CardHeader>
            <CardContent>
              {consent ? (
                <div className="flex items-start gap-2 text-sm">
                  {consent.consented ? (
                    <ShieldCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-medium">
                      {consent.consented ? 'Consent given' : 'Consent not given'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Recorded {shortDateTime(consent.consented_at)} (wording {consent.consent_version})
                      {!consent.consented && viewerIsLandlord &&
                        ' — screening checks cannot be performed for this application.'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No consent record for this application.</p>
              )}
            </CardContent>
          </Card>

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

          {/* Landlord decision + tools */}
          {viewerIsLandlord && (
            <>
              {active && (
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
                    <Button variant="outline" onClick={() => setRequestOpen(true)} disabled={busy}>
                      Request more information
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Private notes</CardTitle>
                  <p className="text-xs text-muted-foreground">Only you can see these.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea
                      aria-label="Add a private note"
                      rows={2}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="e.g. called the reference, checking payslip"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={saveNote} disabled={busy || !newNote.trim()}>
                    Add note
                  </Button>
                  {notes.map((n) => (
                    <div key={n.id} className="text-sm border rounded-lg p-2">
                      <p className="break-words">{n.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">{shortDateTime(n.created_at)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Audit trail */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">History</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div key={e.id} className="text-sm flex justify-between gap-2">
                      <span className="break-words">{eventDescription(e)}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{shortDateTime(e.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
                ? 'The applicant will be notified that you approved their rental application. This ends the application process.'
                : 'The applicant will be notified that you decided not to proceed. This ends the application process.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDecision(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={decision === 'declined' ? 'destructive' : 'default'} onClick={recordDecision} disabled={busy}>
              {busy ? 'Saving…' : decision === 'accepted' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request more information */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request more information</DialogTitle>
            <DialogDescription>
              The applicant will be notified and can respond securely. The original application
              stays unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="request_item">What do you need? *</Label>
              <Select value={requestItem} onValueChange={setRequestItem}>
                <SelectTrigger id="request_item">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_ITEM_SUGGESTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="request_message">Details for the applicant</Label>
              <Textarea
                id="request_message"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Explain exactly what you need"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="request_due">Needed by (optional)</Label>
              <Input id="request_due" type="date" value={requestDue} onChange={(e) => setRequestDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={sendInfoRequest} disabled={busy || !requestItem.trim()}>
              {busy ? 'Sending…' : 'Send request'}
            </Button>
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
            <Button variant="outline" onClick={() => setWithdrawOpen(false)} disabled={busy}>
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
