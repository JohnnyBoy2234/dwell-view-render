import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, AlertCircle, FileText, Users, Calendar, Shield, Settings } from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { useLeaseContracts } from '@/hooks/useLeaseContracts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ContractBasicInfo } from './steps/ContractBasicInfo';
import { ContractParties } from './steps/ContractParties';
import { ContractBankDetails } from './steps/ContractBankDetails';
import { ContractTerms } from './steps/ContractTerms';
import { ContractClauses } from './steps/ContractClauses';
import { ContractReview } from './steps/ContractReview';
import type { LeaseContract, LeaseContractData, ContractBuilderStep } from '@/types/lease';

interface ContractBuilderProps {
  contractId?: string;
  propertyId?: string;
  onComplete?: (contractId: string) => void;
  onCancel?: () => void;
}

const builderSteps: ContractBuilderStep[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Property details and lease basics',
    isRequired: true,
    isCompleted: false,
    component: 'ContractBasicInfo',
    validation: (data) => {
      const errors = [];
      if (!data.propertyAddress) errors.push('Property address is required');
      if (!data.propertyType) errors.push('Property type is required');
      if (!data.rentAmount) errors.push('Rent amount is required');
      return errors;
    }
  },
  {
    id: 'parties',
    title: 'Parties Information',
    description: 'Landlord and tenant details',
    isRequired: true,
    isCompleted: false,
    component: 'ContractParties',
    validation: (data) => {
      const errors = [];
      if (!data.landlordName) errors.push('Landlord name is required');
      if (!data.landlordEmail) errors.push('Landlord email is required');
      return errors;
    }
  },
  {
    id: 'bank-details',
    title: 'Bank Details',
    description: 'Payment account information',
    isRequired: true,
    isCompleted: false,
    component: 'ContractBankDetails',
    validation: (data) => {
      const errors = [];
      if (!data.landlordBankName) errors.push('Bank name is required');
      if (!data.landlordBranchCode) errors.push('Branch code is required');
      if (!data.landlordBranchName) errors.push('Branch name is required');
      if (!data.landlordAccNumber) errors.push('Account number is required');
      return errors;
    }
  },
  {
    id: 'terms',
    title: 'Lease Terms',
    description: 'Duration, payments, and conditions',
    isRequired: true,
    isCompleted: false,
    component: 'ContractTerms',
    validation: (data) => {
      const errors = [];
      if (!data.leaseStartDate) errors.push('Lease start date is required');
      if (!data.leaseEndDate) errors.push('Lease end date is required');
      if (!data.rentPaymentFrequency) errors.push('Payment frequency is required');
      return errors;
    }
  },
  {
    id: 'clauses',
    title: 'Additional Clauses',
    description: 'Custom terms and conditions',
    isRequired: false,
    isCompleted: true,
    component: 'ContractClauses'
  },
  {
    id: 'review',
    title: 'Review & Generate',
    description: 'Final review and PDF generation',
    isRequired: true,
    isCompleted: false,
    component: 'ContractReview'
  }
];

const getAutosaveKey = (userId?: string, contractId?: string, propertyId?: string) => {
  const base = 'sr_lease_autosave';
  if (contractId) return `${base}_contract_${contractId}`;
  if (userId && propertyId) return `${base}_${userId}_${propertyId}`;
  if (userId) return `${base}_${userId}`;
  return base;
};

export function ContractBuilder({ contractId, propertyId, onComplete, onCancel }: ContractBuilderProps) {
  const { contracts, createContract, updateContract, generatePDF } = useLeaseContracts();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [contract, setContract] = useState<LeaseContract | null>(null);
  const [contractData, setContractData] = useState<LeaseContractData>({
    propertyAddress: '',
    propertyType: '',
    propertyDescription: '',
    landlordName: '',
    landlordAddress: '',
    landlordEmail: '',
    landloardIdNumber: '',
    landlordPhone: '',
    tenantName: '',
    tenantAddress: '',
    tenantEmail: '',
    tenantIdNumber: '',
    tenantPhone: '',
    landlordBankName: '',
    landlordBranchCode: '',
    landlordBranchName: '',
    landlordAccNumber: '',
    landlordReference: '',
    leaseStartDate: '',
    leaseEndDate: '',
    rentAmount: 0,
    rentCurrency: 'ZAR',
    rentPaymentFrequency: 'monthly',
    rentDueDay: 1,
    securityDeposit: 0,
    petDeposit: 0,
    keyDeposit: 0,
    utilitiesIncluded: [],
    utilitiesExcluded: [],
    petsAllowed: false,
    smokingAllowed: false,
    guestsAllowed: true,
    sublettingAllowed: false,
    additionalClauses: [],
    furnishedStatus: 'unfurnished',
    parkingSpaces: 0,
    jurisdiction: 'South Africa',
    customFields: {}
  });
  const [steps, setSteps] = useState(builderSteps);
  const [saving, setSaving] = useState(false);
  const [hasLoadedAutosave, setHasLoadedAutosave] = useState(false);
  const [prefillAttempted, setPrefillAttempted] = useState(false);

  // Prefill property and tenant info from context (URL params) and known profile data
  useEffect(() => {
    if (prefillAttempted) return;
    try {
      const url = new URL(window.location.href);
      const urlTenantId = url.searchParams.get('tenantId') || undefined;
      const urlPropertyId = url.searchParams.get('propertyId') || propertyId;

      const doPrefill = async () => {
        const updates: Partial<LeaseContractData> = {};

        // Property prefill
        if (urlPropertyId) {
          const { data: prop } = await supabase
            .from('properties')
            .select('title, location')
            .eq('id', urlPropertyId)
            .maybeSingle();
          if (prop) {
            updates.propertyAddress = `${prop.title || ''}${prop.location ? ', ' + prop.location : ''}`.trim();
          }
        }

        // Tenant prefill from profiles
        if (urlTenantId) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, phone')
            .eq('user_id', urlTenantId)
            .maybeSingle();
          if (prof?.display_name) updates.tenantName = prof.display_name;
          if (prof?.phone) updates.tenantPhone = prof.phone;
        }

        // Landlord prefill
        if (user) {
          const landlordName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
          updates.landlordName = landlordName;
          updates.landlordEmail = user.email || updates.landlordEmail || '';
        }

        if (Object.keys(updates).length > 0) {
          setContractData((prev) => ({ ...prev, ...updates }));
        }
      };

      doPrefill().finally(() => setPrefillAttempted(true));
    } catch {
      setPrefillAttempted(true);
    }
  }, [prefillAttempted, propertyId, user]);

  // Ensure PDF generation creates the contract if needed and stores the PDF URL/status
  const handleGeneratePdfFlow = async () => {
    // Create contract if we don't have one yet
    let contractIdToUse = contract?.id;
    if (!contractIdToUse) {
      const createdId = await createContract(contractData, propertyId);
      if (!createdId) return;
      contractIdToUse = createdId;
    }
    // Ensure latest builder data (including clauses) is persisted before generating
    await updateContract(contractIdToUse, { contract_data: contractData } as any);
    // Generate PDF
    const pdfUrl = await generatePDF(contractIdToUse);
    if (pdfUrl) {
      // Use a valid status per DB constraint: move to pending_tenant after PDF generation
      await updateContract(contractIdToUse, { pdf_url: pdfUrl, status: 'pending_tenant' } as any);
      // Refresh local contract state to surface preview button immediately
      try {
        const { data: updated } = await supabase
          .from('lease_contracts')
          .select('*')
          .eq('id', contractIdToUse)
          .maybeSingle();
        if (updated) {
          setContract(updated as any);
        }
      } catch {
        // ignore UI refresh error
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (contractId) {
        const existingContract = contracts.find(c => c.id === contractId);
        if (existingContract) {
          setContract(existingContract);
          setContractData(existingContract.contract_data);
        }
      }

      const key = getAutosaveKey(contract?.landlord_id || contracts[0]?.landlord_id, contractId, propertyId);
      if (!hasLoadedAutosave && key) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved?.contractData) {
              setContractData((prev) => ({ ...prev, ...saved.contractData }));
            }
            if (typeof saved?.currentStep === 'number') {
              const clamped = Math.min(Math.max(saved.currentStep, 0), builderSteps.length - 1);
              setCurrentStep(clamped);
            }
          }
        } catch (error) {
          console.warn('Failed to load lease autosave', error);
        }
        setHasLoadedAutosave(true);
      }
    };
    loadData();
  }, [contractId, contracts, propertyId, contract, hasLoadedAutosave]);

  useEffect(() => {
    if (!hasLoadedAutosave) return;
    const key = getAutosaveKey(contract?.landlord_id, contract?.id || contractId, propertyId);
    if (!key) return;

    const handler = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({
          contractData,
          currentStep,
          updatedAt: Date.now(),
        }));
      } catch (error) {
        console.warn('Failed to autosave lease contract', error);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [contractData, currentStep, contract?.id, contract?.landlord_id, contractId, propertyId, hasLoadedAutosave]);

  const clearAutosave = () => {
    const key = getAutosaveKey(contract?.landlord_id, contract?.id || contractId, propertyId);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear lease autosave', error);
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = steps[stepIndex];
    if (!step.validation) return true;
    
    const errors = step.validation(contractData);
    return errors.length === 0;
  };

  const updateStepCompletion = () => {
    setSteps(prevSteps => 
      prevSteps.map((step, index) => ({
        ...step,
        isCompleted: step.isRequired ? validateStep(index) : true
      }))
    );
  };

  const updateContractData = (updates: Partial<LeaseContractData>) => {
    setContractData(prev => ({ ...prev, ...updates }));
  };

  const saveContract = async (autoSave = true) => {
    setSaving(true);
    try {
      if (contract) {
        await updateContract(contract.id, { contract_data: contractData });
      } else {
        const newContractId = await createContract(contractData, propertyId);
        if (newContractId) {
          const newContract = contracts.find(c => c.id === newContractId);
          if (newContract) setContract(newContract);
        }
      }
      if (!autoSave) {
        // Manual save notification handled by hook
      }
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      await saveContract();
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await saveContract(false);
    clearAutosave();
    if (onComplete && contract?.id) {
      onComplete(contract.id);
    }
  };

  const getStepIcon = (step: ContractBuilderStep, index: number) => {
    if (index === 0) return <FileText className="h-5 w-5" />;
    if (index === 1) return <Users className="h-5 w-5" />;
    if (index === 2) return <RIcon className="h-7 w-7" />;
    if (index === 3) return <Settings className="h-5 w-5" />;
    return <Shield className="h-5 w-5" />;
  };

  const getStepComponent = () => {
    const step = steps[currentStep];
    const props = {
      data: contractData,
      onUpdate: updateContractData,
      contract: contract
    };

    switch (step.component) {
      case 'ContractBasicInfo':
        return <ContractBasicInfo {...props} />;
      case 'ContractParties':
        return <ContractParties {...props} />;
      case 'ContractBankDetails':
        return <ContractBankDetails {...props} />;
      case 'ContractTerms':
        return <ContractTerms {...props} />;
      case 'ContractClauses':
        return <ContractClauses {...props} />;
      case 'ContractReview':
        return <ContractReview {...props} onGeneratePDF={handleGeneratePdfFlow} />;
      default:
        return <div>Step not found</div>;
    }
  };

  const completedSteps = steps.filter(step => step.isCompleted).length;
  const progress = (completedSteps / steps.length) * 100;

  useEffect(() => {
    updateStepCompletion();
  }, [contractData]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Contract Builder</h1>
          <Badge variant="secondary">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="text-sm text-muted-foreground">
          {completedSteps} of {steps.length} steps completed
        </div>
      </div>

      {/* Steps Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4 overflow-x-auto">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-2 min-w-0 cursor-pointer transition-colors ${
                  index === currentStep 
                    ? 'text-primary' 
                    : step.isCompleted 
                    ? 'text-green-600' 
                    : 'text-muted-foreground'
                }`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="flex-shrink-0">
                  {step.isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : index === currentStep ? (
                    <AlertCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{step.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStepIcon(steps[currentStep], currentStep)}
            <span>{steps[currentStep].title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getStepComponent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : prevStep}
          disabled={saving}
        >
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => saveContract(false)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!validateStep(currentStep) || saving}
            >
              Next Step
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!steps.every(step => step.isCompleted) || saving}
            >
              Complete Contract
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}