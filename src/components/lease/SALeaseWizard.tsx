// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_WIZARD_DATA, WIZARD_STEPS, type LeaseWizardData } from '@/types/lease';
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
  onComplete?: (contractId: string) => void;
  onCancel?: () => void;
}

const validators = [validateStep01, validateStep02, validateStep03, validateStep04, validateStep05, validateStep06, validateStep07, validateStep08, validateStep09, validateStep10];

export function SALeaseWizard({ contractId, propertyId, onComplete, onCancel }: SALeaseWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<LeaseWizardData>(DEFAULT_WIZARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(contractId || null);

  // Load existing contract data
  useEffect(() => {
    if (contractId) {
      loadContract(contractId);
    } else if (user) {
      // Pre-fill landlord info
      setData(prev => ({
        ...prev,
        landlordEmail: user.email || '',
        landlordFullName: user.user_metadata?.full_name || '',
      }));
    }
  }, [contractId, user]);

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

  const saveProgress = async () => {
    if (!user) return;
    try {
      if (savedContractId) {
        await supabase.from('lease_contracts').update({ contract_data: data as any, updated_at: new Date().toISOString() }).eq('id', savedContractId);
      } else {
        const { data: newContract, error } = await supabase.from('lease_contracts').insert({
          landlord_id: user.id,
          property_id: propertyId,
          title: data.propertyAddress ? `Lease for ${data.propertyAddress.split('\n')[0]}` : 'New Lease Agreement',
          contract_data: data as any,
          status: 'draft'
        }).select().single();
        if (error) throw error;
        setSavedContractId(newContract.id);
      }
    } catch (err) {
      console.error('Error saving:', err);
    }
  };

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

  const handleGenerate = async () => {
    if (!savedContractId) { toast.error('Please save the contract first'); return; }
    setIsGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-lease-pdf', { body: { contractId: savedContractId } });
      if (error) throw error;
      toast.success('PDF generated successfully');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToTenant = async () => {
    if (!savedContractId || !data.tenantEmail) { toast.error('Tenant email required'); return; }
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contract-to-tenant', { body: { contractId: savedContractId, tenantEmail: data.tenantEmail } });
      if (error) throw error;
      toast.success('Contract sent to tenant');
      onComplete?.(savedContractId);
    } catch (err) {
      toast.error('Failed to send contract');
    } finally {
      setIsSending(false);
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
      case 10: return <Step10ReviewGenerate {...props} onGenerate={handleGenerate} onSendToTenant={handleSendToTenant} isGenerating={isGenerating} isSending={isSending} />;
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
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
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
    </div>
  );
}
