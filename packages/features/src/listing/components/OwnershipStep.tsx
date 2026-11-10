import * as React from 'react';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { ShieldCheck, XCircle, Clock } from 'lucide-react';
import { FileUploadZone } from '../../kyc/components/FileUploadZone';
import type { OwnershipStatus } from '../validation';

interface OwnershipStepProps {
  status: OwnershipStatus;
  declineReason?: string | null;
  uploading: boolean;
  uploadError?: string | null;
  onUpload: (file: File) => void;
}

export default function OwnershipStep({ status, declineReason, uploading, uploadError, onUpload }: OwnershipStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Proof of ownership</h2>
        <p className="text-muted-foreground">
          Upload your title deed so we can verify you own this property before it goes live.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="p-6 space-y-3">
            {status === 'verified' ? (
              <p className="flex items-center gap-2 text-sm text-success">
                <ShieldCheck className="h-4 w-4" /> Title deed verified.
              </p>
            ) : status === 'submitted' ? (
              // Once submitted, swap the upload widget for a confirmation —
              // leaving the dropzone visible made a successful upload look
              // like nothing had happened.
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Thanks — your title deed is submitted.</p>
                  <p className="text-sm text-muted-foreground">We'll verify it and let you know.</p>
                </div>
              </div>
            ) : (
              <>
                {status === 'declined' && (
                  <p className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4 shrink-0" /> Declined: {declineReason || 'Please re-upload a clearer copy.'}
                  </p>
                )}
                <FileUploadZone
                  label="Title deed"
                  description="Photo or PDF, so we can verify you own this property."
                  accept={{ 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }}
                  maxSize={10 * 1024 * 1024}
                  isUploading={uploading}
                  uploadError={uploadError ?? undefined}
                  onFileSelect={onUpload}
                  // Removal isn't supported yet — no currentFile/previewUrl is passed in,
                  // so the remove button never renders; re-uploading replaces the deed.
                  onFileRemove={() => {}}
                />
              </>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-4">
          You can still continue without uploading now — you won't be able to go live until it's verified.
        </p>
      </div>
    </div>
  );
}
