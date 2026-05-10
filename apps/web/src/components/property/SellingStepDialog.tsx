import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Upload, Loader2, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SuccessDialog } from '@/components/ui/SuccessDialog';
import { SellingStep, SELLING_STEPS } from '@/data/sellingSteps';

interface SellingStepDialogProps {
  step: SellingStep | null;
  propertyId: string;
  isCompleted: boolean;
  onClose: () => void;
  onToggleComplete: (stepNumber: number, completed: boolean) => void;
}

export function SellingStepDialog({
  step,
  propertyId,
  isCompleted,
  onClose,
  onToggleComplete,
}: SellingStepDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!step) return null;

  const nextStep = SELLING_STEPS.find((s) => s.number === step.number + 1) ?? null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const path = `selling-docs/${user.id}/${propertyId}/step-${step.number}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true });

      if (storageError) throw storageError;

      await supabase.from('documents').insert({
        user_id: user.id,
        file_path: path,
        file_type: file.type || 'application/octet-stream',
        document_type: 'seller_doc',
        status: 'pending',
      });

      setUploadedFileName(file.name);
      toast({ title: 'Document uploaded', description: file.name });
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleMarkComplete = () => {
    onToggleComplete(step.number, true);
    setShowSuccess(true);
  };

  const completedCount = 0; // passed from parent if needed

  return (
    <>
      <Dialog open={!!step} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-ocean-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-ocean-blue font-bold text-sm">{step.number}</span>
              </div>
              <div>
                <Badge variant="secondary" className="text-xs mb-1">
                  Phase {step.phaseNumber} · {step.phase}
                </Badge>
                <DialogTitle className="text-lg leading-tight">{step.title}</DialogTitle>
              </div>
              {isCompleted && (
                <CheckCircle2 className="h-5 w-5 text-success-green ml-auto flex-shrink-0" />
              )}
            </div>
          </DialogHeader>

          <div className="space-y-5">
            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

            {/* What to do */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">What to do</h4>
              <ul className="space-y-2">
                {step.whatToDo.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-ocean-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-ocean-blue text-xs font-semibold">{i + 1}</span>
                    </div>
                    <span className="text-sm text-gray-700 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Document Upload */}
            {step.requiresUpload && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {step.uploadLabel ?? 'Upload Document'}
                </h4>
                {step.uploadDescription && (
                  <p className="text-xs text-muted-foreground mb-3">{step.uploadDescription}</p>
                )}
                {uploadedFileName ? (
                  <div className="flex items-center gap-2 text-sm text-success-green">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{uploadedFileName}</span>
                    <button
                      onClick={() => setUploadedFileName(null)}
                      className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="pointer-events-none"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? 'Uploading…' : 'Choose File'}
                    </Button>
                    <span className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC</span>
                  </label>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              {!isCompleted ? (
                <Button onClick={handleMarkComplete} className="w-full bg-success-green hover:bg-success-green/90 text-white">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => onToggleComplete(step.number, false)}
                  className="w-full text-gray-500"
                >
                  Mark as Incomplete
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion celebration */}
      <SuccessDialog
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onClose();
        }}
        icon="check"
        title={`Step ${step.number} Complete!`}
        subtitle={step.title}
        nextSteps={
          nextStep
            ? [
                {
                  title: `Next: Step ${nextStep.number} — ${nextStep.title}`,
                  description: nextStep.description,
                },
              ]
            : [
                {
                  title: 'All steps complete!',
                  description:
                    'Your property transfer is nearing completion. Congratulations!',
                },
              ]
        }
        primaryAction={{
          label: 'Continue Journey',
          onClick: () => {
            setShowSuccess(false);
            onClose();
          },
        }}
        showConfetti
      />
    </>
  );
}
