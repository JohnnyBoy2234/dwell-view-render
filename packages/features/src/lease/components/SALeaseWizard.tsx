// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { DEFAULT_WIZARD_DATA, WIZARD_STEPS, type LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { LeasePreviewModal } from './LeasePreviewModal';
import { SuccessDialog } from '@mzanzihomes/ui/components/SuccessDialog';
import {
  Step01LeaseBasics, validateStep01,
  Step02Parties, validateStep02,
  Step03PropertyDetails, validateStep03,
  Step04DepositFees, validateStep04,
  Step05CPA, validateStep05,
  Step06PropertyFeatures, validateStep06,
  Step07Maintenance, validateStep07,
  Step08ConditionReport, validateStep08,
  Step09Exclusions, validateStep09,
  Step10ReviewGenerate, validateStep10,
} from './steps-sa';

interface SALeaseWizardProps {
  contractId?: string;
  propertyId?: string;
  tenantId?: string;
  onContractSaved?: (contractId: string) => void;
  onComplete?: (contractId: string) => void;
  onCancel?: () => void;
}

interface SignatureInfo {
  imageUrl: string;
  name: string;
  signedAt: string;
}

const validators = [validateStep01, validateStep02, validateStep03, validateStep04, validateStep05, validateStep06, validateStep07, validateStep08, validateStep09, validateStep10];

export function SALeaseWizard({ contractId, propertyId, tenantId, onContractSaved, onComplete, onCancel }: SALeaseWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<LeaseWizardData>(DEFAULT_WIZARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(contractId || null);
  
  // Lease preview modal state
  const [showLeasePreview, setShowLeasePreview] = useState(false);
  const [landlordSignature, setLandlordSignature] = useState<SignatureInfo | undefined>();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successType, setSuccessType] = useState<'signed' | 'sent'>('sent');
  
  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const initialDataRef = React.useRef<string>(JSON.stringify(DEFAULT_WIZARD_DATA));

  // Load existing contract data
  useEffect(() => {
    if (contractId) {
      loadContract(contractId);
    } else if (user) {
      initializeNewContract();
    }
    // Only re-run when the contract identity or landlord identity actually
    // changes, not on every `user` object reference change (e.g. token
    // refresh) - otherwise landlord edits to these same fields get clobbered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, user?.id]);

  // For a brand-new lease started from an accepted application, resume any
  // existing draft for this landlord/property/tenant instead of starting
  // blank, and pre-fill tenant details from their application so the
  // landlord isn't guessing at data they were never told.
  const initializeNewContract = async () => {
    if (!user) return;

    // Pull every fact we already hold so the landlord isn't asked to enter
    // details they were never told (tenant, property and lease terms).
    const prefill: Partial<LeaseWizardData> = { landlordEmail: user.email || '' };

    // ── Landlord (from their own profile + screening) ──
    const [{ data: llProfile }, { data: llScreening }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
      supabase.from('screening_details').select('full_name, id_number, phone, current_address').eq('user_id', user.id).maybeSingle(),
    ]);
    prefill.landlordFullName = llScreening?.full_name || llProfile?.display_name || user.user_metadata?.full_name || '';
    prefill.landlordIdNumber = llScreening?.id_number || '';
    prefill.landlordPhone = llScreening?.phone || '';
    prefill.landlordAddress = llScreening?.current_address || '';

    // ── Tenant (from their profile + screening) ──
    if (tenantId) {
      const [{ data: tProfile }, { data: tScreening }] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', tenantId).maybeSingle(),
        supabase.from('screening_details').select('full_name, id_number, phone, current_address').eq('user_id', tenantId).maybeSingle(),
      ]);
      prefill.tenantFullName = tScreening?.full_name || tProfile?.display_name || '';
      prefill.tenantIdNumber = tScreening?.id_number || '';
      prefill.tenantPhone = tScreening?.phone || '';
      prefill.tenantAddress = tScreening?.current_address || '';
    }

    // ── Property details ──
    if (propertyId) {
      const { data: property } = await supabase
        .from('properties')
        .select('title, location, price')
        .eq('id', propertyId)
        .maybeSingle();
      if (property) {
        prefill.propertyAddress = property.location || property.title || '';
        if (property.price) {
          prefill.rentAmount = Number(property.price);
          prefill.depositAmount = Number(property.price); // default: one month
        }
      }
    }

    // ── Lease terms from the invite the tenant accepted (rent + dates) ──
    if (propertyId && tenantId) {
      const { data: invite } = await supabase
        .from('property_invites')
        .select('monthly_rent, lease_start, lease_end')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (invite) {
        if (invite.monthly_rent) {
          prefill.rentAmount = Number(invite.monthly_rent);
          prefill.depositAmount = Number(invite.monthly_rent);
        }
        if (invite.lease_start) prefill.leaseStartDate = invite.lease_start;
        if (invite.lease_end) prefill.leaseEndDate = invite.lease_end;
      }
    }

    // ── Banking details from saved settings (so it's entered once) ──
    const { data: settings } = await supabase
      .from('landlord_settings')
      .select('bank, account_holder, account_number, branch_code')
      .eq('user_id', user.id)
      .maybeSingle();
    if (settings) {
      prefill.landlordBankName = settings.bank || '';
      prefill.landlordAccountHolder = settings.account_holder || prefill.landlordFullName || '';
      prefill.landlordAccountNumber = settings.account_number || '';
      prefill.landlordBranchCode = settings.branch_code || '';
    } else {
      prefill.landlordAccountHolder = prefill.landlordFullName || '';
    }

    // Resume an existing draft if there is one, but backfill any BLANK fields
    // from the prefill (older drafts were saved before auto-fill existed).
    const isBlank = (v: any) => v === undefined || v === null || v === '' || v === 0;
    if (propertyId && tenantId) {
      const { data: existingDraft } = await supabase
        .from('lease_contracts')
        .select('id, contract_data, landlord_signed_at, landlord_signature_data')
        .eq('landlord_id', user.id)
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .eq('status', 'draft')
        .maybeSingle();

      if (existingDraft) {
        setSavedContractId(existingDraft.id);
        onContractSaved?.(existingDraft.id);
        const saved = (existingDraft.contract_data || {}) as any;
        const merged: any = { ...DEFAULT_WIZARD_DATA, ...saved };
        for (const [k, pv] of Object.entries(prefill)) {
          if (pv != null && pv !== '' && isBlank(merged[k])) merged[k] = pv;
        }
        setData(merged);
        if (existingDraft.landlord_signed_at && existingDraft.landlord_signature_data) {
          const sig = existingDraft.landlord_signature_data as any;
          setLandlordSignature({
            imageUrl: sig.signature_image_url || sig.signatureImageUrl,
            name: merged.landlordFullName || 'Landlord',
            signedAt: new Date(existingDraft.landlord_signed_at).toLocaleString(),
          });
        }
        return;
      }
    }

    setData(prev => ({ ...prev, ...prefill }));
  };

  // Save banking details for reuse and, on the first lease, create the
  // landlord's Paystack payout subaccount from what they entered.
  const ensureBankingSetup = async () => {
    if (!user) return;
    const holder = (data.landlordAccountHolder || data.landlordFullName || '').trim();
    try {
      const bankFields = {
        bank: data.landlordBankName || '',
        account_holder: holder,
        account_number: data.landlordAccountNumber || '',
        branch_code: data.landlordBranchCode || '',
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from('landlord_settings').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) {
        await supabase.from('landlord_settings').update(bankFields as any).eq('user_id', user.id);
      } else {
        await supabase.from('landlord_settings').insert({
          user_id: user.id,
          name: data.landlordFullName || holder || 'Landlord',
          address: data.landlordAddress || '',
          contact: data.landlordPhone || data.landlordEmail || '',
          ...bankFields,
        } as any);
      }
    } catch (e) {
      console.warn('Saving banking settings failed', e);
    }
    try {
      const { data: profile } = await supabase
        .from('profiles').select('paystack_subaccount_code').eq('user_id', user.id).maybeSingle();
      if (!profile?.paystack_subaccount_code && data.landlordBankCode && data.landlordAccountNumber && holder) {
        await supabase.functions.invoke('create-paystack-subaccount', {
          body: {
            bankName: data.landlordBankCode,
            accountNumber: data.landlordAccountNumber,
            accountHolderName: holder,
          },
        });
      }
    } catch (e) {
      console.warn('Payout subaccount setup failed', e);
    }
  };

  // Auto-save effect - triggers 2 seconds after data changes
  useEffect(() => {
    if (!user) return;
    
    const currentData = JSON.stringify(data);
    // Skip if data hasn't meaningfully changed
    if (currentData === initialDataRef.current) return;
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    setAutoSaveStatus('saving');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveProgressInternal();
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('idle');
      }
    }, 2000); // 2 second debounce
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user?.id]);

  // Update initial data ref when contract loads
  useEffect(() => {
    if (!isLoading && data !== DEFAULT_WIZARD_DATA) {
      initialDataRef.current = JSON.stringify(data);
    }
  }, [isLoading]);

  const loadContract = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: contract, error } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (contract?.contract_data) {
        setData({ ...DEFAULT_WIZARD_DATA, ...contract.contract_data });
        
        // Load landlord signature if exists
        if (contract.landlord_signed_at && contract.landlord_signature_data) {
          const sigData = contract.landlord_signature_data as any;
          setLandlordSignature({
            imageUrl: sigData.signature_image_url || sigData.signatureImageUrl,
            name: contract.contract_data.landlordFullName || 'Landlord',
            signedAt: new Date(contract.landlord_signed_at).toLocaleString(),
          });
        }
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      toast.error('Failed to load contract');
    } finally {
      setIsLoading(false);
    }
  };

  const updateData = (updates: Partial<LeaseWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  // Internal save function used by auto-save
  const saveProgressInternal = async () => {
    if (!user) return;
    try {
      if (savedContractId) {
        await supabase.from('lease_contracts').update({ contract_data: data as any, updated_at: new Date().toISOString() }).eq('id', savedContractId);
      } else {
        const { data: newContract, error } = await supabase.from('lease_contracts').insert({
          landlord_id: user.id,
          property_id: propertyId,
          tenant_id: tenantId,
          title: data.propertyAddress ? `Lease for ${data.propertyAddress.split('\n')[0]}` : 'New Lease Agreement',
          contract_data: data as any,
          status: 'draft'
        }).select().single();
        if (error) throw error;
        setSavedContractId(newContract.id);
        onContractSaved?.(newContract.id);
      }
    } catch (err) {
      console.error('Error saving:', err);
      throw err;
    }
  };

  const saveProgress = saveProgressInternal;

  const handleNext = async () => {
    const result = validators[currentStep - 1](data);
    if (!result.isValid) {
      result.errors.forEach(e => toast.error(e));
      return;
    }
    await saveProgress();
    if (currentStep < 10) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handlePreviewAndSign = () => {
    setShowLeasePreview(true);
  };

  // Landlord signing at creation was removed: the tenant reviews and signs
  // first, then the landlord countersigns from the Leases tab.

  const handleSendToTenant = async () => {
    if (!savedContractId || (!tenantId && !data.tenantEmail)) {
      toast.error('Select a tenant or enter their email');
      return;
    }
    setIsSending(true);
    try {
      // Save banking details + set up rent payouts (subaccount) once-off.
      await ensureBankingSetup();
      const { error } = await supabase.functions.invoke('send-contract-to-tenant', {
        body: { contractId: savedContractId, tenantEmail: data.tenantEmail, tenantId }
      });
      if (error) throw error;
      
      setSuccessType('sent');
      setShowSuccessDialog(true);
    } catch (err) {
      toast.error('Failed to send contract');
    } finally {
      setIsSending(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    if (successType === 'sent') {
      onComplete?.(savedContractId!);
    }
  };

  const progress = (currentStep / 10) * 100;
  const stepConfig = WIZARD_STEPS[currentStep - 1];

  const renderStep = () => {
    const props = { data, onUpdate: updateData };
    switch (currentStep) {
      case 1: return <Step01LeaseBasics {...props} />;
      case 2: return <Step02Parties {...props} />;
      case 3: return <Step03PropertyDetails {...props} />;
      case 4: return <Step04DepositFees {...props} />;
      case 5: return <Step05CPA {...props} />;
      case 6: return <Step06PropertyFeatures {...props} />;
      case 7: return <Step07Maintenance {...props} />;
      case 8: return <Step08ConditionReport {...props} />;
      case 9: return <Step09Exclusions {...props} />;
      case 10: return (
        <Step10ReviewGenerate 
          {...props} 
          onPreviewAndSign={handlePreviewAndSign}
          onSendToTenant={handleSendToTenant} 
          isGenerating={isGenerating} 
          isSending={isSending}
          landlordHasSigned={!!landlordSignature}
        />
      );
      default: return null;
    }
  };

  if (isLoading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Step {currentStep} of 10: {stepConfig?.title}</span>
          <div className="flex items-center gap-2">
            {autoSaveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-xs text-success-green">✓ Saved</span>
            )}
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : handleBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        {currentStep < 10 && (
          <Button onClick={handleNext}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Lease Preview Modal — review only. The tenant signs first; the
          landlord countersigns from the Leases tab after the tenant signs. */}
      <LeasePreviewModal
        open={showLeasePreview}
        onOpenChange={setShowLeasePreview}
        wizardData={data}
        mode="landlord"
        landlordSignature={landlordSignature}
        onSendToTenant={handleSendToTenant}
        isSending={isSending}
      />

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={handleSuccessClose}
        icon={successType === 'signed' ? 'check' : 'send'}
        title={successType === 'signed' ? 'Lease Signed!' : 'Lease Sent!'}
        subtitle={successType === 'signed' 
          ? 'You have successfully signed the lease agreement.'
          : `The lease has been sent to ${data.tenantEmail}`
        }
        nextSteps={successType === 'signed' ? [
          { title: 'Send to tenant', description: 'The tenant will receive the lease to review and sign' },
        ] : [
          { title: 'Tenant reviews', description: 'The tenant will review the lease agreement' },
          { title: 'Tenant signs', description: 'Once signed, you\'ll receive the completed lease' },
        ]}
        primaryAction={{
          label: successType === 'signed' ? 'Continue' : 'Done',
          onClick: handleSuccessClose
        }}
        showConfetti={successType === 'sent'}
      />
    </div>
  );
}
