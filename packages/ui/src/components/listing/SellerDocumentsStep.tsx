import { useState } from 'react';
import { Upload, FileText, X, Loader2, Info } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UploadedDoc {
  label: string;
  fileName: string;
  url: string;
}

interface DocSlot {
  key: string;
  label: string;
  hint: string;
}

const DOC_SLOTS: DocSlot[] = [
  {
    key: 'title_deed',
    label: 'Title Deed',
    hint: 'Proof of ownership — obtainable from the Deeds Office or your bank if the property is bonded',
  },
  {
    key: 'rates_statement',
    label: 'Latest Rates Statement',
    hint: 'Municipal rates statement showing no arrears',
  },
  {
    key: 'compliance_certs',
    label: 'Compliance Certificates',
    hint: 'Electrical COC, plumbing, gas — required by law before transfer',
  },
  {
    key: 'other',
    label: 'Other Documents',
    hint: 'Any additional documents relevant to the sale (levy clearance, HOA approval, etc.)',
  },
];

interface SellerDocumentsStepProps {
  propertyId?: string;
}

export default function SellerDocumentsStep({ propertyId }: SellerDocumentsStepProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, UploadedDoc>>({});

  const handleUpload = async (slotKey: string, label: string, file: File) => {
    if (!user) return;
    setUploading(slotKey);
    try {
      const pid = propertyId ?? 'draft';
      const path = `selling-docs/${user.id}/${pid}/listing/${slotKey}-${file.name}`;

      const { error: storageError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('branding').getPublicUrl(path);

      setUploaded((prev) => ({
        ...prev,
        [slotKey]: { label, fileName: file.name, url: urlData.publicUrl },
      }));

      toast({ title: 'Document saved', description: file.name });
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = (slotKey: string) => {
    setUploaded((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-ocean-blue/5 border border-ocean-blue/20 rounded-xl">
        <Info className="h-5 w-5 text-ocean-blue mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold mb-1">Optional — but recommended</p>
          <p className="text-muted-foreground">
            Uploading key documents now helps buyers see you're prepared and can speed up the
            transfer process once an offer is accepted. You can also add documents later from
            your property management page.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {DOC_SLOTS.map((slot) => {
          const doc = uploaded[slot.key];
          const isUploading = uploading === slot.key;

          return (
            <div key={slot.key} className="border border-gray-100 rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{slot.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{slot.hint}</p>
                </div>
                {doc ? (
                  <div className="flex items-center gap-2 text-sm text-success-green flex-shrink-0">
                    <FileText className="h-4 w-4" />
                    <span className="max-w-[120px] truncate text-xs">{doc.fileName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(slot.key)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex-shrink-0 cursor-pointer">
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(slot.key, slot.label, file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="pointer-events-none text-xs"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isUploading ? 'Uploading…' : 'Upload'}
                    </Button>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Accepted formats: PDF, JPG, PNG, DOC · Max 10 MB per file
      </p>
    </div>
  );
}
