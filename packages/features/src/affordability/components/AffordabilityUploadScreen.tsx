// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Alert, AlertDescription } from '@mzanzihomes/ui/components/alert';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Upload, FileText, Trash2, Loader2, Eye, Info } from 'lucide-react';
import {
  getAffordabilitySettings,
  listAffordabilityDocuments,
  uploadAffordabilityDocument,
  deleteAffordabilityDocument,
  getAffordabilityDocumentUrl,
  submitAffordabilityForAnalysis,
} from '../service';
import type { AffordabilityDocument, AffordabilitySettings } from '../types';

const fmtSize = (b: number | null) =>
  b == null ? '' : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`;

interface Props {
  applicationId: string;
  /** Called after the tenant submits for analysis. */
  onSubmitted?: (jobId: string) => void;
}

export function AffordabilityUploadScreen({ applicationId, onSubmitted }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AffordabilitySettings | null>(null);
  const [docs, setDocs] = useState<AffordabilityDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => setDocs(await listAffordabilityDocuments(applicationId));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s] = await Promise.all([getAffordabilitySettings()]);
        const d = await listAffordabilityDocuments(applicationId);
        if (!active) return;
        setSettings(s);
        setDocs(d);
      } catch (e: any) {
        if (active) toast({ variant: 'destructive', title: 'Could not load your uploads', description: e?.message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [applicationId]);

  const limits = settings?.uploadLimits;
  const atLimit = !!limits && docs.length >= limits.max_files;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !limits) return;
    const picked = Array.from(files);
    setUploading(true);
    try {
      for (const file of picked) {
        if (docs.length >= limits.max_files) {
          toast({ title: 'Upload limit reached', description: `You can upload at most ${limits.max_files} statements.` });
          break;
        }
        // Client-side pre-checks (the server re-validates authoritatively).
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          toast({ variant: 'destructive', title: 'Only PDF statements are supported', description: file.name });
          continue;
        }
        if (file.size > limits.max_file_bytes) {
          toast({ variant: 'destructive', title: 'File too large', description: `${file.name} exceeds ${Math.round(limits.max_file_bytes / 1048576)}MB.` });
          continue;
        }
        try {
          await uploadAffordabilityDocument(applicationId, file);
          await refresh();
        } catch (e: any) {
          toast({ variant: 'destructive', title: 'Upload failed', description: e?.message || file.name });
        }
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (doc: AffordabilityDocument) => {
    try {
      await deleteAffordabilityDocument(applicationId, doc.id);
      await refresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not remove the file', description: e?.message });
    }
  };

  const preview = async (doc: AffordabilityDocument) => {
    try {
      const url = await getAffordabilityDocumentUrl(applicationId, doc.id);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not open the file', description: e?.message });
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAffordabilityForAnalysis(applicationId);
      toast({ title: 'Submitted for analysis', description: 'We\'ll process your statements securely. This can take a few minutes.' });
      onSubmitted?.(res.jobId);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not submit', description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-bold">Upload your bank statements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your statements are processed securely for this affordability assessment only.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Please upload PDF statements covering at least the last{' '}
          <span className="font-medium">{limits?.required_months ?? 3} months</span>. Supported: PDF only,
          up to {Math.round((limits?.max_file_bytes ?? 15728640) / 1048576)}MB each, {limits?.max_files ?? 6} files max.
          Download the official PDF from your banking app for the most reliable result.
        </AlertDescription>
      </Alert>

      {/* Upload zone */}
      <Card>
        <CardContent className="p-5">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            id="afford-file"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <label
            htmlFor="afford-file"
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${atLimit ? 'pointer-events-none opacity-50' : 'hover:border-primary hover:bg-primary/5'}`}
          >
            {uploading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-primary" />}
            <span className="text-sm font-medium">{uploading ? 'Uploading…' : atLimit ? 'Upload limit reached' : 'Tap to choose PDF statements'}</span>
            <span className="text-xs text-muted-foreground">PDF only · {docs.length}/{limits?.max_files ?? 6} uploaded</span>
          </label>
        </CardContent>
      </Card>

      {/* Document list */}
      {docs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Your statements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.original_filename || 'Statement.pdf'}</p>
                    <p className="text-xs text-muted-foreground">{fmtSize(doc.byte_size)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => preview(doc)} aria-label="Preview"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(doc)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={submit} disabled={docs.length === 0 || submitting || uploading} className="sm:min-w-[220px]">
          {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>) : 'Submit for analysis'}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        You can remove a file before submitting. After submitting, your statements are processed securely and the
        result is shared only with the authorised parties for this application.
      </p>
    </div>
  );
}

export default AffordabilityUploadScreen;
