// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Loader2, CheckCircle2, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { startAffordabilityProcessing, getProcessingJob } from '../service';
import type { AffordabilityJob, AffordabilityJobStatus } from '../types';

const STEP_LABELS: Record<AffordabilityJobStatus, string> = {
  uploaded: 'Queued',
  validating: 'Validating files',
  virus_scanning: 'Security scan',
  extracting_text: 'Reading statements',
  running_ocr: 'Processing pages',
  detecting_bank: 'Detecting bank',
  extracting_transactions: 'Extracting transactions',
  categorising_transactions: 'Categorising transactions',
  validating_balances: 'Checking balances',
  calculating_affordability: 'Calculating affordability',
  generating_report: 'Preparing report',
  completed: 'Completed',
  requires_review: 'Needs review',
  failed: 'Failed',
};

const TERMINAL = ['completed', 'requires_review', 'failed'];

interface Props {
  applicationId: string;
  /** Called once the job reaches a terminal state. */
  onDone?: (status: AffordabilityJobStatus) => void;
}

export function AffordabilityProcessingScreen({ applicationId, onDone }: Props) {
  const { toast } = useToast();
  const [job, setJob] = useState<AffordabilityJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  const poll = async () => {
    try {
      const j = await getProcessingJob(applicationId);
      setJob(j);
      if (j && TERMINAL.includes(j.status) && !doneRef.current) {
        doneRef.current = true;
        if (pollRef.current) clearInterval(pollRef.current);
        onDone?.(j.status);
      }
    } catch {
      /* transient — keep polling */
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      // Kick off processing once (idempotent server-side), then poll.
      if (!startedRef.current) {
        startedRef.current = true;
        try { await startAffordabilityProcessing(applicationId); } catch { /* may already be running */ }
      }
      if (!active) return;
      await poll();
      pollRef.current = setInterval(poll, 2500);
    })();
    return () => { active = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, [applicationId]);

  const retry = async () => {
    doneRef.current = false;
    try {
      await startAffordabilityProcessing(applicationId);
      toast({ title: 'Retrying', description: 'We\'re processing your statements again.' });
      if (!pollRef.current) pollRef.current = setInterval(poll, 2500);
      await poll();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not retry', description: e?.message });
    }
  };

  const status = job?.status;
  const progress = job?.progress ?? 5;

  if (status === 'completed') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100"><CheckCircle2 className="h-6 w-6 text-green-600" /></div>
          <p className="text-lg font-bold">Affordability assessment ready</p>
          <p className="max-w-sm text-sm text-muted-foreground">Your statements were processed. The landlord will review the assessment — it is not an automatic approval or rejection.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'requires_review') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100"><Info className="h-6 w-6 text-amber-600" /></div>
          <p className="text-lg font-bold">Some information needs review</p>
          <p className="max-w-sm text-sm text-muted-foreground">Some information could not be verified automatically. Please request another statement or a manual review — the landlord will follow up.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'failed') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><AlertTriangle className="h-6 w-6 text-muted-foreground" /></div>
          <p className="text-lg font-bold">Processing didn't complete</p>
          <p className="max-w-sm text-sm text-muted-foreground">Something went wrong while processing your statements. You can try again.</p>
          <Button onClick={retry} className="mt-1"><RefreshCw className="mr-2 h-4 w-4" /> Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <p className="text-lg font-bold">Processing your statements</p>
          <p className="text-sm text-muted-foreground">{status ? STEP_LABELS[status] : 'Starting…'}</p>
        </div>
        <div className="w-full max-w-sm"><Progress value={progress} className="h-2" /></div>
        <p className="max-w-sm text-xs text-muted-foreground">This is processed securely on our own systems and can take a few minutes. You can leave this page and come back — we'll keep working.</p>
      </CardContent>
    </Card>
  );
}

export default AffordabilityProcessingScreen;
