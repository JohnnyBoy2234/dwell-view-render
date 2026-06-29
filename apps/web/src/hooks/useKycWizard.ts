import { useState, useCallback } from 'react';
import { useKyc } from '@/hooks/useKyc';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { KYC_STEPS, KYC_TOAST_MESSAGES, KycStepType } from '@mzanzihomes/common/constants/kycConstants';

export interface KycWizardState {
  currentStep: number;
  idFront: File | null;
  selfie: File | null;
  declarationAccepted: boolean;
  idFrontPreview: string;
  selfiePreview: string;
  showQRModal: boolean;
  qrModalType: KycStepType;
}

export interface KycWizardActions {
  handleFileSelect: (file: File, type: KycStepType) => Promise<void>;
  handleFileRemove: (type: KycStepType) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleSubmit: () => Promise<void>;
  handleStepClick: (stepIndex: number) => void;
  openQRModal: (type: KycStepType) => void;
  setShowQRModal: (show: boolean) => void;
  setDeclarationAccepted: (accepted: boolean) => void;
  canProceedToNext: () => boolean;
  isStepCompleted: (stepIndex: number) => boolean;
}

export interface KycWizardConfig {
  onComplete: () => void;
}

/**
 * Hook to manage KYC wizard state and business logic
 */
export function useKycWizard({ onComplete }: KycWizardConfig): KycWizardState & KycWizardActions {
  const [currentStep, setCurrentStep] = useState(0);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [idFrontPreview, setIdFrontPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalType, setQRModalType] = useState<KycStepType>('id_front');

  const { kycProfile, uploadFile, submitForReview } = useKyc();
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File, type: KycStepType) => {
    try {
      const preview = URL.createObjectURL(file);
      
      switch (type) {
        case 'id_front':
          setIdFront(file);
          setIdFrontPreview(preview);
          break;
        case 'selfie':
          setSelfie(file);
          setSelfiePreview(preview);
          break;
      }
      
      await uploadFile(file, type);
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
    }
  }, [uploadFile]);

  const handleFileRemove = useCallback((type: KycStepType) => {
    switch (type) {
      case 'id_front':
        setIdFront(null);
        if (idFrontPreview) {
          URL.revokeObjectURL(idFrontPreview);
          setIdFrontPreview('');
        }
        break;
      case 'selfie':
        setSelfie(null);
        if (selfiePreview) {
          URL.revokeObjectURL(selfiePreview);
          setSelfiePreview('');
        }
        break;
    }
  }, [idFrontPreview, selfiePreview]);

  const canProceedToNext = useCallback((): boolean => {
    switch (currentStep) {
      case 0: return !!(idFront || kycProfile?.id_front_path);
      case 1: return !!(selfie || kycProfile?.selfie_path);
      case 2: return declarationAccepted;
      default: return false;
    }
  }, [currentStep, idFront, selfie, declarationAccepted, kycProfile]);

  const isStepCompleted = useCallback((stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return !!(idFront || kycProfile?.id_front_path);
      case 1: return !!(selfie || kycProfile?.selfie_path);
      default: return false;
    }
  }, [idFront, selfie, kycProfile]);

  const handleNext = useCallback(() => {
    if (canProceedToNext() && currentStep < KYC_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [canProceedToNext, currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    try {
      await submitForReview();
      toast({
        title: KYC_TOAST_MESSAGES.SUCCESS_TITLE,
        description: KYC_TOAST_MESSAGES.SUCCESS_DESCRIPTION,
      });
      onComplete();
    } catch (error) {
      console.error('Submission error:', error);
    }
  }, [submitForReview, toast, onComplete]);

  const handleStepClick = useCallback((stepIndex: number) => {
    // For mobile, directly trigger file input instead of QR modal
    if (stepIndex === 0) {
      const fileInput = document.getElementById('mobile-id-front-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    } else if (stepIndex === 1) {
      const fileInput = document.getElementById('mobile-selfie-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  }, []);

  const openQRModal = useCallback((type: KycStepType) => {
    setQRModalType(type);
    setShowQRModal(true);
  }, []);

  return {
    // State
    currentStep,
    idFront,
    selfie,
    declarationAccepted,
    idFrontPreview,
    selfiePreview,
    showQRModal,
    qrModalType,
    
    // Actions
    handleFileSelect,
    handleFileRemove,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleStepClick,
    openQRModal,
    setShowQRModal,
    setDeclarationAccepted,
    canProceedToNext,
    isStepCompleted,
  };
}