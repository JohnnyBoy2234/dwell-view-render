import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignatureCapture } from "./SignatureCapture";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaseSigningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenancyId: string;
  leaseDocumentUrl?: string;
  currentStatus: string;
  onSigned?: () => void;
}

export const LeaseSigningDialog = ({
  isOpen,
  onClose,
  tenancyId,
  leaseDocumentUrl,
  currentStatus,
  onSigned
}: LeaseSigningDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'view' | 'sign'>('view');
  const [signing, setSigning] = useState(false);

  const handleSignatureCapture = async (signatureDataUrl: string) => {
    if (!user) return;

    setSigning(true);
    try {
      // Convert base64 to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      // Upload signature
      const fileName = `${user.id}/${tenancyId}/signature-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lease-documents')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Determine user role and update accordingly
      const { data: tenancy, error: fetchError } = await supabase
        .from('tenancies')
        .select('landlord_id, tenant_id, lease_status')
        .eq('id', tenancyId)
        .single();

      if (fetchError) throw fetchError;

      const isLandlord = tenancy.landlord_id === user.id;
      const isTenant = tenancy.tenant_id === user.id;

      if (!isLandlord && !isTenant) {
        throw new Error("You are not authorized to sign this lease");
      }

      // Update tenancy with signature and advance status
      const updateData: any = {};
      
      if (isLandlord) {
        updateData.landlord_signature_url = uploadData.path;
        updateData.landlord_signed_at = new Date().toISOString();
        // If tenant already signed, complete the lease; otherwise, wait for tenant
        if (tenancy.lease_status === 'awaiting_landlord_signature') {
          updateData.lease_status = 'completed';
          updateData.status = 'active';
        } else if (tenancy.lease_status === 'awaiting_tenant_signature') {
          // Landlord signed first; still awaiting tenant
          updateData.lease_status = 'awaiting_tenant_signature';
        }
      } else if (isTenant) {
        updateData.tenant_signature_url = uploadData.path;
        updateData.tenant_signed_at = new Date().toISOString();
        // After tenant signs, move to awaiting landlord signature unless already signed by landlord
        if (tenancy.lease_status === 'awaiting_tenant_signature') {
          updateData.lease_status = 'awaiting_landlord_signature';
        } else if (tenancy.lease_status === 'awaiting_landlord_signature') {
          updateData.lease_status = 'completed';
          updateData.status = 'active';
        }
      }

      const { error: updateError } = await supabase
        .from('tenancies')
        .update(updateData)
        .eq('id', tenancyId);

      if (updateError) throw updateError;

      toast.success("Lease signed successfully!");
      onSigned?.();
      onClose();
    } catch (error) {
      console.error('Error signing lease:', error);
      toast.error("Failed to sign lease");
    } finally {
      setSigning(false);
    }
  };

  const viewDocument = async () => {
    if (!leaseDocumentUrl) return;

    try {
      // Check if it's a file path (starts without http) or a direct URL
      if (leaseDocumentUrl.startsWith('http')) {
        // Legacy direct URL
        window.open(leaseDocumentUrl, '_blank');
      } else {
        // File path in storage
        const { data, error } = await supabase.storage
          .from('lease-documents')
          .download(leaseDocumentUrl);

        if (error) throw error;

        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error("Failed to open document");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Lease Agreement Signing</DialogTitle>
            <Badge variant="outline">{currentStatus.replace('_', ' ').toUpperCase()}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'view' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Please review the lease agreement before signing.
              </p>
              
              <div className="flex gap-2">
                <Button onClick={viewDocument} variant="outline">
                  View Lease Document
                </Button>
                <Button onClick={() => setStep('sign')}>
                  Proceed to Sign
                </Button>
              </div>
            </div>
          )}

          {step === 'sign' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">Important:</p>
                <p className="text-yellow-700 text-sm mt-1">
                  By signing this document, you agree to all terms and conditions outlined in the lease agreement. 
                  This signature is legally binding.
                </p>
              </div>

              <SignatureCapture
                onSignatureCapture={handleSignatureCapture}
                onCancel={() => setStep('view')}
                title="Digital Signature"
              />

              {signing && (
                <div className="text-center text-muted-foreground">
                  Processing signature...
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};