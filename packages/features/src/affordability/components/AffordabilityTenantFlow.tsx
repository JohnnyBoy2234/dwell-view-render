// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@mzanzihomes/ui/components/dialog';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Loader2, CheckCircle2, Info } from 'lucide-react';
import { AffordabilityConsentScreen } from './AffordabilityConsentScreen';
import { AffordabilityUploadScreen } from './AffordabilityUploadScreen';
import { AffordabilityProcessingScreen } from './AffordabilityProcessingScreen';
import { getAssessment, getAffordabilityReport, submitAffordabilityCorrection } from '../service';

const fmtR = (n) => (n == null ? '—' : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n));

function TenantSummary({ applicationId, assessment, onChanged }) {
  const { toast } = useToast();
  const [report, setReport] = useState(null);
  const [dialog, setDialog] = useState(null); // 'correction' | 'human_review'
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => { try { setReport(await getAffordabilityReport(applicationId)); } catch { /* ignore */ } })(); }, [applicationId]);

  const submit = async (action) => {
    setBusy(true);
    try {
      await submitAffordabilityCorrection(applicationId, { action, message: msg || undefined });
      toast({ title: action === 'human_review' ? 'Human review requested' : 'Correction requested', description: 'Your landlord has been notified.' });
      setDialog(null); setMsg('');
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: 'Could not send your request', description: e?.message }); }
    finally { setBusy(false); }
  };

  const status = assessment.status;
  const income = report?.incomeSources ?? [];
  const verified = income.filter((s) => s.is_verified_recurring);
  // Tenant-facing warnings only (avoid internal integrity jargon).
  const items = (report?.warnings ?? []).filter((w) => w.severity !== 'info');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          {status === 'assessment_ready'
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            : <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
          <div>
            <p className="font-semibold">
              {status === 'assessment_ready' ? 'Your affordability assessment is complete'
                : status === 'correction_requested' ? 'A correction has been requested'
                : status === 'processing_failed' ? 'Processing didn\'t complete'
                : 'Your assessment needs review'}
            </p>
            <p className="text-sm text-muted-foreground">
              This was shared with your landlord to support their decision. It is not an automatic approval or rejection —
              your landlord makes the final decision.
            </p>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">What we found</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {verified.length > 0 ? (
              <p>Recurring income of about <span className="font-semibold">{fmtR(verified[0].average_monthly_amount)}/month</span> was detected across {verified[0].months_present} month(s).</p>
            ) : (
              <p className="text-muted-foreground">No reliable recurring income was detected from the statements provided.</p>
            )}
            <p className="text-muted-foreground">{report.transactions.length} transactions were read from your statement(s).</p>
            {items.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Items you may want to check</p>
                <ul className="mt-1 space-y-1">{items.map((w) => <li key={w.id} className="flex gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />{w.message}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setDialog('correction'); setMsg(''); }}>Request a correction</Button>
        <Button variant="outline" size="sm" onClick={() => { setDialog('human_review'); setMsg(''); }}>Request human review</Button>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'human_review' ? 'Request human review' : 'Request a correction'}</DialogTitle>
            <DialogDescription>
              {dialog === 'human_review'
                ? 'Ask for a person to review your assessment. Your landlord will be notified.'
                : 'Tell us what was extracted incorrectly. Your landlord will be notified.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder={dialog === 'human_review' ? 'Optional: anything you\'d like reviewed…' : 'Describe what looks wrong…'} value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
            <Button disabled={busy || (dialog === 'correction' && !msg.trim())} onClick={() => submit(dialog)}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Tenant-side orchestrator: shows the right step based on assessment status. */
export function AffordabilityTenantFlow({ applicationId }) {
  const [assessment, setAssessment] = useState(undefined); // undefined = loading
  const reload = async () => setAssessment((await getAssessment(applicationId)) ?? null);
  useEffect(() => { reload(); }, [applicationId]);

  if (assessment === undefined) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const status = assessment?.status;
  if (!assessment || status === 'not_requested' || status === 'waiting_for_tenant') {
    return <AffordabilityConsentScreen applicationId={applicationId} onConsented={reload} />;
  }
  if (status === 'consent_granted' || status === 'documents_uploaded') {
    return <AffordabilityUploadScreen applicationId={applicationId} onSubmitted={reload} />;
  }
  if (status === 'processing') {
    return <AffordabilityProcessingScreen applicationId={applicationId} onDone={reload} />;
  }
  // assessment_ready | manual_review_required | correction_requested | processing_failed | expired
  return <TenantSummary applicationId={applicationId} assessment={assessment} onChanged={reload} />;
}

export default AffordabilityTenantFlow;
