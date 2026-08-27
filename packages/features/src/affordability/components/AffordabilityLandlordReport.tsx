// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@mzanzihomes/ui/components/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, Info, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { getAffordabilityReport, submitAffordabilityReview, getAffordabilitySummary } from '../service';

const fmtR = (n) => (n == null ? '—' : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n));
const fmtPct = (r) => (r == null ? '—' : `${Math.round(r * 100)}%`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

const REC_LABEL = {
  strong: 'Strong affordability indicators',
  acceptable: 'Affordability appears acceptable',
  further_review: 'Further review recommended',
  insufficient: 'Insufficient or unverifiable information',
};
const REC_CLASS = {
  strong: 'bg-emerald-100 text-emerald-800',
  acceptable: 'bg-blue-100 text-blue-800',
  further_review: 'bg-amber-100 text-amber-800',
  insufficient: 'bg-slate-100 text-slate-700',
};
const CONF_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence', unable_to_assess: 'Unable to assess' };
const CONF_CLASS = { high: 'bg-emerald-100 text-emerald-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-orange-100 text-orange-800', unable_to_assess: 'bg-slate-100 text-slate-700' };
const SEV_LABEL = { info: 'Info', warning: 'Review', unable_to_verify: 'Could not verify', potential_integrity: 'Needs manual review' };
const SEV_CLASS = { info: 'bg-blue-50 text-blue-700 border-blue-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', unable_to_verify: 'bg-slate-50 text-slate-600 border-slate-200', potential_integrity: 'bg-orange-50 text-orange-700 border-orange-200' };

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Section({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 p-4 text-left">
        <span className="flex items-center gap-2 font-semibold">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{title}</span>
        {count != null && <Badge variant="secondary">{count}</Badge>}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

export function AffordabilityLandlordReport({ applicationId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideRec, setOverrideRec] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [requestOpen, setRequestOpen] = useState(null); // 'request_more_info' | 'request_another_statement'
  const [requestMsg, setRequestMsg] = useState('');
  const [summary, setSummary] = useState(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const load = async () => setReport(await getAffordabilityReport(applicationId));
  useEffect(() => {
    let active = true;
    (async () => {
      try { const r = await getAffordabilityReport(applicationId); if (active) setReport(r); }
      catch (e) { if (active) toast({ variant: 'destructive', title: 'Could not load the assessment', description: e?.message }); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [applicationId]);

  const act = async (payload, successMsg) => {
    setBusy(true);
    try { await submitAffordabilityReview(applicationId, payload); toast({ title: successMsg }); await load(); }
    catch (e) { toast({ variant: 'destructive', title: 'Action failed', description: e?.message }); }
    finally { setBusy(false); }
  };

  // As soon as the assessment is ready, show the plain-language summary
  // automatically — returning the cached one, or generating it if none exists.
  // The landlord should never have to click to get their explanation.
  const status = report?.assessment?.status;
  useEffect(() => {
    if (status !== 'assessment_ready' && status !== 'manual_review_required') return;
    if (summary?.summary) return; // already have it
    let active = true;
    setSummaryBusy(true);
    setSummaryError(null);
    (async () => {
      try { const r = await getAffordabilitySummary(applicationId); if (active) setSummary(r); }
      catch (e) { if (active) setSummaryError(e?.message || 'Could not generate the summary'); }
      finally { if (active) setSummaryBusy(false); }
    })();
    return () => { active = false; };
  }, [applicationId, status]);

  const genSummary = async (force) => {
    setSummaryBusy(true);
    setSummaryError(null);
    try { const r = await getAffordabilitySummary(applicationId, { force }); setSummary(r); }
    catch (e) { setSummaryError(e?.message || 'Could not generate the summary'); toast({ variant: 'destructive', title: 'Could not generate the summary', description: e?.message }); }
    finally { setSummaryBusy(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const a = report?.assessment;
  if (!a) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">No affordability assessment has been requested for this application yet.</CardContent></Card>;
  }

  // Non-ready states.
  const stateBanner = {
    waiting_for_tenant: { icon: Clock, text: 'Waiting for the tenant to give consent and upload statements.' },
    consent_granted: { icon: Clock, text: 'Consent granted — waiting for the tenant to upload statements.' },
    documents_uploaded: { icon: Clock, text: 'Statements uploaded — waiting for the tenant to submit for analysis.' },
    processing: { icon: Loader2, text: 'Statements are being processed. This can take a few minutes.' },
    processing_failed: { icon: Info, text: 'Processing did not complete. The tenant can retry, or you can request another statement.' },
    correction_requested: { icon: Info, text: 'A correction / more information has been requested from the tenant.' },
    expired: { icon: Info, text: 'This assessment has expired per the retention policy.' },
    deleted: { icon: Info, text: 'This assessment has been deleted.' },
  }[a.status];

  const m = report.metrics || {};
  const positives = report.reasonCodes.filter((r) => r.polarity === 'positive');
  const toReview = report.reasonCodes.filter((r) => r.polarity !== 'positive');
  const latestOverride = report.reviews.find((r) => r.action === 'override_recommendation');
  const showData = a.status === 'assessment_ready' || a.status === 'manual_review_required';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">Affordability assessment</h2>
        {a.recommendation && <Badge className={REC_CLASS[a.recommendation]}>{REC_LABEL[a.recommendation]}</Badge>}
        {a.confidence_status && <Badge className={CONF_CLASS[a.confidence_status]}>{CONF_LABEL[a.confidence_status]}</Badge>}
      </div>

      {stateBanner && (
        <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <stateBanner.icon className="h-4 w-4 shrink-0" /> {stateBanner.text}
        </CardContent></Card>
      )}

      {a.status === 'manual_review_required' && (
        <Card className="border-amber-200 bg-amber-50/40"><CardContent className="p-4 text-sm text-amber-800">
          Some information could not be verified automatically. Please request another statement or complete a manual review.
        </CardContent></Card>
      )}

      {showData && (
        <>
          {/* Overview */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="Proposed rent" value={`${fmtR(a.proposed_rent)} / mo`} />
              <Metric label="Statement period" value={`${fmtDate(a.statement_period_start)} – ${fmtDate(a.statement_period_end)}`} />
              <Metric label="Verified recurring income" value={`${fmtR(m.verified_monthly_income)} / mo`} />
              <Metric label="Average monthly income" value={`${fmtR(m.average_monthly_income)} / mo`} />
              <Metric label="Average essential expenses" value={`${fmtR(m.essential_monthly_expenses)} / mo`} />
              <Metric label="Recurring debt obligations" value={`${fmtR(m.recurring_debt_obligations)} / mo`} />
              <Metric label="Est. disposable income" value={`${fmtR(m.average_monthly_disposable_income)} / mo`} />
              <Metric label="Lowest monthly balance" value={fmtR(m.lowest_monthly_balance)} />
              <Metric label="Average closing balance" value={fmtR(m.average_closing_balance)} />
              <Metric label="Rent-to-income" value={fmtPct(m.rent_to_income_ratio)} />
              <Metric label="Rent-to-disposable" value={fmtPct(m.rent_to_disposable_income_ratio)} />
              <Metric label="Returned debit orders" value={m.returned_debit_order_count ?? 0} />
              <Metric label="Insufficient-funds events" value={m.insufficient_funds_count ?? 0} />
              <Metric label="Statement coverage" value={`${m.statement_coverage_months ?? 0} months`} />
              <Metric label="Warnings" value={report.warnings.length} />
              <Metric label="Last processed" value={fmtDate(a.updated_at)} />
            </CardContent>
          </Card>

          {/* Recommendation reasons */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Why this recommendation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {positives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Positive indicators</p>
                  <ul className="mt-1 space-y-1 text-sm">{positives.map((r) => <li key={r.id} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{r.message}</li>)}</ul>
                </div>
              )}
              {toReview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Items to review</p>
                  <ul className="mt-1 space-y-1 text-sm">{toReview.map((r) => <li key={r.id} className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{r.message}</li>)}</ul>
                </div>
              )}
              {latestOverride && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2 text-sm">
                  <span className="font-medium">Landlord override:</span> {REC_LABEL[latestOverride.override_recommendation] || latestOverride.override_recommendation} — {latestOverride.override_reason}
                </div>
              )}
              <p className="text-xs text-muted-foreground">This report is an assessment aid and not an automatic approval or rejection.</p>
            </CardContent>
          </Card>

          {/* AI plain-language summary (explains the deterministic result; never decides) */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Plain-language summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary?.summary ? (
                <>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{summary.summary}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      AI-generated explanation of the figures above — not a decision or a guarantee.
                    </p>
                    <Button size="sm" variant="ghost" disabled={summaryBusy} onClick={() => genSummary(true)}>
                      {summaryBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="ml-1">Regenerate</span>
                    </Button>
                  </div>
                </>
              ) : summaryBusy ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Writing a plain-language explanation of the figures above…
                </div>
              ) : summaryError ? (
                <>
                  <p className="text-sm text-muted-foreground">{summaryError}</p>
                  <Button size="sm" disabled={summaryBusy} onClick={() => genSummary(false)}>
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Try again
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Get a short, plain-English explanation of what these figures mean for the proposed rent.
                    It explains the assessment above — it does not make the decision.
                  </p>
                  <Button size="sm" disabled={summaryBusy} onClick={() => genSummary(false)}>
                    {summaryBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                    Explain this assessment
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Expandable detail */}
          <Section title="Income sources" count={report.incomeSources.length}>
            <div className="space-y-2">
              {report.incomeSources.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                  <span className="truncate">{s.label || s.category} {s.is_verified_recurring && <Badge variant="secondary" className="ml-1">recurring</Badge>}</span>
                  <span className="shrink-0 font-medium">{fmtR(s.average_monthly_amount)} / mo · {s.months_present} mo</span>
                </div>
              ))}
              {report.incomeSources.length === 0 && <p className="text-sm text-muted-foreground">No income sources detected.</p>}
            </div>
          </Section>

          <Section title="Expense categories" count={report.expenseCategories.length}>
            <div className="space-y-2">
              {report.expenseCategories.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                  <span className="capitalize">{(c.category || '').replace(/_/g, ' ')}{c.is_recurring && <Badge variant="secondary" className="ml-1">recurring</Badge>}</span>
                  <span className="shrink-0 font-medium">{fmtR(c.average_monthly_amount)} / mo</span>
                </div>
              ))}
              {report.expenseCategories.length === 0 && <p className="text-sm text-muted-foreground">No expense categories detected.</p>}
            </div>
          </Section>

          <Section title="Supporting transactions" count={report.transactions.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-muted-foreground"><th className="py-1 pr-2">Date</th><th className="py-1 pr-2">Description</th><th className="py-1 pr-2 text-right">Amount</th><th className="py-1 pr-2">Category</th><th className="py-1 pr-2">Page</th><th className="py-1">Conf.</th></tr></thead>
                <tbody>
                  {report.transactions.map((t) => (
                    <tr key={t.id} className={`border-t ${t.is_excluded ? 'text-muted-foreground line-through' : ''}`}>
                      <td className="py-1 pr-2 whitespace-nowrap">{t.txn_date}</td>
                      <td className="py-1 pr-2 max-w-[180px] truncate" title={t.description}>{t.description}</td>
                      <td className={`py-1 pr-2 text-right ${t.direction === 'credit' ? 'text-emerald-700' : ''}`}>{t.direction === 'debit' ? '-' : '+'}{fmtR(t.amount)}</td>
                      <td className="py-1 pr-2 capitalize">{(t.category || '').replace(/_/g, ' ')}</td>
                      <td className="py-1 pr-2">{t.source_page ?? '—'}</td>
                      <td className="py-1">{t.confidence_score != null ? `${Math.round(t.confidence_score * 100)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.transactions.length === 0 && <p className="text-sm text-muted-foreground">No transactions extracted.</p>}
            </div>
          </Section>

          {report.warnings.length > 0 && (
            <Section title="Validation warnings" count={report.warnings.length} defaultOpen>
              <div className="space-y-2">
                {report.warnings.map((w) => (
                  <div key={w.id} className={`rounded-lg border p-2 text-sm ${SEV_CLASS[w.severity] || SEV_CLASS.warning}`}>
                    <span className="mr-2 text-[11px] font-bold uppercase">{SEV_LABEL[w.severity] || 'Review'}</span>{w.message}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Warnings highlight items to review — they are not accusations of wrongdoing.</p>
            </Section>
          )}
        </>
      )}

      {/* Review controls (decision-support only — separate from Approve/Decline) */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Your review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Add an internal review note (only staff can see this)…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy || !note.trim()} onClick={() => act({ action: 'note', note }, 'Note added').then(() => setNote(''))}>Add note</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: 'mark_reviewed', note: note || undefined }, 'Marked as reviewed')}>Mark as reviewed</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setOverrideOpen(true)}>Override recommendation</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRequestOpen('request_more_info'); setRequestMsg(''); }}>Request more information</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRequestOpen('request_another_statement'); setRequestMsg(''); }}>Request another statement</Button>
          </div>
          {report.reviews.length > 0 && (
            <div className="space-y-1 pt-1">
              {report.reviews.map((r) => (
                <div key={r.id} className="rounded border p-2 text-xs text-muted-foreground">
                  <span className="font-medium capitalize">{r.action.replace(/_/g, ' ')}</span>
                  {r.override_recommendation ? ` → ${r.override_recommendation} (${r.override_reason})` : r.note ? `: ${r.note}` : ''} · {fmtDate(r.created_at)}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">The final Approve / Decline decision for this application is separate from this affordability assessment.</p>
        </CardContent>
      </Card>

      {/* Override dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Override recommendation</DialogTitle><DialogDescription>Set a different recommendation. A reason is required and is recorded.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Select value={overrideRec} onValueChange={setOverrideRec}>
              <SelectTrigger><SelectValue placeholder="Choose a recommendation" /></SelectTrigger>
              <SelectContent>
                {Object.entries(REC_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Reason for the override (required)…" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button disabled={busy || !overrideRec || !overrideReason.trim()} onClick={() => act({ action: 'override', overrideRecommendation: overrideRec, overrideReason }, 'Recommendation overridden').then(() => setOverrideOpen(false))}>Save override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request info / another statement dialog */}
      <Dialog open={!!requestOpen} onOpenChange={(o) => !o && setRequestOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{requestOpen === 'request_another_statement' ? 'Request another statement' : 'Request more information'}</DialogTitle>
            <DialogDescription>The tenant will be notified. Add an optional message.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Message to the tenant (optional)…" value={requestMsg} onChange={(e) => setRequestMsg(e.target.value)} rows={3} />
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setRequestOpen(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => act({ action: requestOpen, message: requestMsg || undefined }, 'Request sent to tenant').then(() => setRequestOpen(null))}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AffordabilityLandlordReport;
