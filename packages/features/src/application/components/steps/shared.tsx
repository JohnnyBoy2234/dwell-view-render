import { useRef, useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@mzanzihomes/ui/components/radio-group';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Camera, Eye, FileText, Loader2, Upload, X } from 'lucide-react';
import {
  fileProblem,
  getDocumentUrl,
  removeApplicationDocument,
  uploadApplicationDocument
} from '../../services/documentService';
import type { ApplicationFormData, DocRef, SectionKey } from '../../types';
import type { FieldErrors } from '../../validation';

export interface StepProps {
  data: ApplicationFormData;
  update: <S extends SectionKey>(section: S, patch: Partial<ApplicationFormData[S]>) => void;
  errors: FieldErrors;
  userId: string;
  onUploadComplete: () => void;
}

export const FieldError = ({ error }: { error?: string }) =>
  error ? <p className="text-xs text-destructive mt-1">{error}</p> : null;

export function Field({
  id,
  label,
  error,
  notice,
  required,
  children
}: {
  id: string;
  label: string;
  error?: string;
  /** Non-blocking "we're not sure about this" hint, e.g. for low-confidence OCR fields. */
  notice?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
      <FieldError error={error} />
      {!error && notice && <p className="text-xs text-amber-600 mt-1">{notice}</p>}
    </div>
  );
}

/** One uploaded document: name, preview via signed URL, remove. */
export function DocumentRow({ doc, onRemove }: { doc: DocRef; onRemove?: () => void }) {
  const { toast } = useToast();
  const preview = async () => {
    try {
      const url = await getDocumentUrl(doc);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast({ title: 'Preview failed', description: 'Could not open the document. Please try again.', variant: 'destructive' });
    }
  };
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm font-medium truncate">{doc.name}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={preview} aria-label="Preview document">
          <Eye className="h-4 w-4" />
        </Button>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label="Remove document">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface DocumentUploadProps {
  documentType: string;
  userId: string;
  accept: string;
  label: string;
  helperText?: string;
  /** Adds a "Take photo" button that opens the device camera. */
  camera?: boolean;
  onUploaded: (doc: DocRef, file: File) => void;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

/** Upload button(s) + progress state for one document type. */
export function DocumentUpload({
  documentType,
  userId,
  accept,
  label,
  helperText,
  camera,
  onUploaded,
  onUploadComplete,
  disabled
}: DocumentUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const problem = fileProblem(file, documentType);
    if (problem) {
      toast({ title: 'Could not upload', description: problem, variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const doc = await uploadApplicationDocument(file, documentType, userId);
      onUploaded(doc, file);
      onUploadComplete?.();
      toast({ title: 'Document uploaded', description: `${file.name} has been uploaded.` });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: 'The document could not be uploaded. Please check your connection and try again.',
        variant: 'destructive'
      });
      console.error(`Upload failed (${documentType})`, error);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
      if (cameraInput.current) cameraInput.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInput.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {label}
        </Button>
        {camera && (
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInput.current?.click()}
            disabled={disabled || uploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Take photo
          </Button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {camera && (
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      )}
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

/** Removes a document from storage, surfacing failures as a toast. */
export function useRemoveDocument() {
  const { toast } = useToast();
  return async (doc: DocRef, onRemoved: () => void) => {
    try {
      await removeApplicationDocument(doc);
      onRemoved();
      toast({ title: 'Document removed' });
    } catch (error) {
      console.error('Document removal failed', error);
      toast({ title: 'Removal failed', description: 'Could not remove the document. Please try again.', variant: 'destructive' });
    }
  };
}

/** The recurring "Yes / No" radio question. */
export function YesNoQuestion({
  id,
  label,
  value,
  onChange,
  error
}: {
  id: string;
  label: string;
  value: 'yes' | 'no' | '';
  onChange: (v: 'yes' | 'no') => void;
  error?: string;
}) {
  return (
    <div>
      <Label className="text-sm leading-snug">{label}</Label>
      <RadioGroup className="flex gap-6 mt-2" value={value} onValueChange={(v) => onChange(v as 'yes' | 'no')}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${id}_yes`} />
          <Label htmlFor={`${id}_yes`}>Yes</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${id}_no`} />
          <Label htmlFor={`${id}_no`}>No</Label>
        </div>
      </RadioGroup>
      <FieldError error={error} />
    </div>
  );
}

export const textInput = (
  id: string,
  value: string,
  onChange: (v: string) => void,
  props: Partial<React.ComponentProps<typeof Input>> = {}
) => <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...props} />;
