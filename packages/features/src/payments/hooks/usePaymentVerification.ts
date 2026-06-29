// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

interface VerificationResult {
  success: boolean;
  status: string;
  confidence: number;
  starAwarded: boolean;
  badgeUnlocked: boolean;
  badgeData: any;
  receiptUrl: string | null;
}

export function usePaymentVerification() {
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const uploadAndVerifyProof = async (
    file: File,
    tenancyId: string,
    expectedAmount: number
  ): Promise<VerificationResult | null> => {
    try {
      setUploading(true);

      // Convert file to base64
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const imageData = await imageDataPromise;

      // Upload file to storage
      const fileName = `${tenancyId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('proof-of-payment')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploading(false);
      setVerifying(true);

      // Run OCR
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke(
        'ai-payment-ocr',
        {
          body: { imageData, tenancyId, expectedAmount }
        }
      );

      if (ocrError) throw ocrError;

      if (!ocrData.success || ocrData.confidence < 0.5) {
        toast({
          variant: 'destructive',
          title: 'Could not verify payment',
          description: 'Please ensure the proof of payment is clear and shows all details.'
        });
        return null;
      }

      // Create payment proof record (types will regenerate after migration)
      const currentUser = (await supabase.auth.getUser()).data.user;
      const { data: proofRecord } = await (supabase as any)
        .from('payment_proofs')
        .insert({
          file_path: uploadData.path,
          file_type: file.type,
          file_size_bytes: file.size,
          ocr_raw_output: ocrData.extracted,
          extraction_confidence: ocrData.confidence,
          verified_fields: ocrData.extracted,
          uploaded_by: currentUser?.id
        })
        .select()
        .single();

      // Get or create payment record
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data: existingPayment } = await (supabase as any)
        .from('payments')
        .select('*')
        .eq('tenancy_id', tenancyId)
        .eq('due_period_yyyymm', period)
        .maybeSingle();

      let paymentId = existingPayment?.id;

      if (!existingPayment) {
        const { data: tenancy } = await supabase
          .from('tenancies')
          .select('*')
          .eq('id', tenancyId)
          .single();

        if (!tenancy) throw new Error('Tenancy not found');

        const dueDay = 1; // Default to 1st of month
        const { data: newPayment } = await (supabase as any)
          .from('payments')
          .insert({
            tenancy_id: tenancyId,
            landlord_id: tenancy.landlord_id,
            tenant_id: tenancy.tenant_id,
            due_period_yyyymm: period,
            expected_amount_cents: Math.round(expectedAmount * 100),
            payment_method: 'eft_upload',
            proof_file_path: uploadData.path,
            due_date: new Date(new Date().getFullYear(), new Date().getMonth(), dueDay)
          })
          .select()
          .single();

        paymentId = newPayment?.id;
      }

      // Verify payment
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-payment-proof',
        {
          body: {
            paymentId,
            ocrData: ocrData.extracted,
            confidence: ocrData.confidence,
            proofId: proofRecord?.id
          }
        }
      );

      if (verifyError) throw verifyError;

      setVerifying(false);

      if (verifyData.success) {
        toast({
          title: verifyData.status === 'verified' ? 'Payment verified!' : 'Payment received',
          description: verifyData.status === 'verified' 
            ? 'Your payment has been confirmed.'
            : 'Your payment is being reviewed.'
        });
      }

      return verifyData;

    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error.message || 'Something went wrong'
      });
      return null;
    } finally {
      setUploading(false);
      setVerifying(false);
    }
  };

  return {
    uploading,
    verifying,
    uploadAndVerifyProof
  };
}
