// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Alert, AlertDescription } from '@mzanzihomes/ui/components/alert';
import { Separator } from '@mzanzihomes/ui/components/separator';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { ShieldCheck, FileText, Lock, Info, Building2, User, Loader2 } from 'lucide-react';
import {
  getAffordabilitySettings,
  getAffordabilityContext,
  getAssessment,
  recordAffordabilityConsent,
} from '../service';
import type { AffordabilityContext, AffordabilitySettings } from '../types';

const fmtR = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

interface Props {
  applicationId: string;
  /** Called once consent has been recorded server-side. */
  onConsented?: (assessmentId: string) => void;
}

const WHAT_WE_ANALYSE = [
  'Income and recurring deposits',
  'Essential expenses and recurring commitments',
  'Debit orders and debt repayments',
  'Account balances and account activity',
];

const YOUR_RIGHTS = [
  'You can request access to the information we hold.',
  'You can request a correction if something was extracted incorrectly.',
  'You can dispute a result you believe is inaccurate.',
  'The assessment supports human review — it does not make the rental decision automatically.',
];

export function AffordabilityConsentScreen({ applicationId, onConsented }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AffordabilitySettings | null>(null);
  const [context, setContext] = useState<AffordabilityContext | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyGranted, setAlreadyGranted] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, c, a] = await Promise.all([
          getAffordabilitySettings(),
          getAffordabilityContext(applicationId),
          getAssessment(applicationId),
        ]);
        if (!active) return;
        setSettings(s);
        setContext(c);
        if (a && a.status !== 'waiting_for_tenant' && a.status !== 'not_requested') {
          setAlreadyGranted(true);
        }
      } catch (e: any) {
        if (active) toast({ variant: 'destructive', title: 'Could not load the consent details', description: e?.message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [applicationId]);

  const handleConsent = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      const res = await recordAffordabilityConsent(applicationId);
      toast({ title: 'Consent recorded', description: 'You can now upload your bank statements.' });
      onConsented?.(res.assessmentId);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not record consent', description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (alreadyGranted) {
    return (
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>You've already given consent for this application. You can continue to upload your statements.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Affordability assessment
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your bank statements help the landlord assess whether the rent is affordable for you. This is
          an assessment aid — the landlord makes the final decision after reviewing it. It is not an
          automatic approval or rejection.
        </p>
      </div>

      {/* Who / what this relates to */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This request relates to</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{context?.propertyTitle}</span></div>
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">Landlord: {context?.landlordName}</span></div>
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground shrink-0" /><span>Proposed rent: <span className="font-medium">{fmtR(context?.proposedRent)}</span> per month</span></div>
          <div className="text-xs text-muted-foreground">Application reference: {applicationId.slice(0, 8).toUpperCase()}</div>
        </CardContent>
      </Card>

      {/* What is analysed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What will be analysed</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1.5 text-sm sm:grid-cols-2">
          {WHAT_WE_ANALYSE.map((item) => (
            <div key={item} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{item}</div>
          ))}
        </CardContent>
      </Card>

      {/* How it's handled + rights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> How your information is handled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Your statements are processed securely by our own systems for this affordability assessment only. Results are shared only with the authorised parties involved in this application, and information is retained according to our privacy policy.</p>
          <Separator />
          <ul className="space-y-1.5">
            {YOUR_RIGHTS.map((r) => (
              <li key={r} className="flex items-start gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{r}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* The consent statement */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-foreground/90">
            {settings?.consentText}
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
            <span className="text-sm">I have read and I consent to the secure processing of my bank statements for this affordability assessment.</span>
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={handleConsent} disabled={!accepted || submitting} className="sm:min-w-[220px]">
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording consent…</>) : 'I consent — continue to upload'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Consent version {settings?.consentVersion}. You can withdraw consent later from your application.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AffordabilityConsentScreen;
