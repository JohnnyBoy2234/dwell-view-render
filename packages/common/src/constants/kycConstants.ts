/**
 * Constants for KYC (Know Your Customer) verification functionality
 */

import { Shield, FileText, Camera, CheckCircle, Star, Zap } from 'lucide-react';

// KYC wizard steps configuration
export const KYC_STEPS = [
  { 
    id: 'id-front', 
    title: 'Front of ID', 
    icon: FileText, 
    description: 'Photo of the front side of your government-issued ID' 
  },
  { 
    id: 'selfie', 
    title: 'Selfie with ID', 
    icon: Camera, 
    description: 'Take a selfie while holding your ID next to your face' 
  },
  { 
    id: 'review', 
    title: 'Review & Submit', 
    icon: CheckCircle, 
    description: 'Review your documents and submit for verification' 
  }
] as const;

// KYC step types
export type KycStepType = 'id_front' | 'selfie';

// Trust indicators for mobile design
export const TRUST_INDICATORS = [
  {
    icon: Star,
    label: 'Secure',
    color: 'text-ocean-blue',
    bgColor: 'bg-white/80'
  },
  {
    icon: Zap,
    label: 'Fast',
    color: 'text-success-green',
    bgColor: 'bg-white/80'
  },
  {
    icon: Shield,
    label: 'Verified',
    color: 'text-ocean-blue',
    bgColor: 'bg-white/80'
  }
] as const;

// KYC labels and messages
export const KYC_LABELS = {
  IDENTITY_VERIFICATION: 'Identity Verification',
  STEP_LABEL: (current: number, total: number) => `Step ${current} of ${total}`,
  COMPLETE_BOTH_STEPS: 'Complete both steps to verify your identity and unlock full platform access',
  READY_TO_SUBMIT: 'Ready to Submit',
  COMPLETE_STEPS_MESSAGE: 'Complete both steps above to submit your verification',
  DOCUMENTS_READY_MESSAGE: 'Your documents are ready! Submit for verification to unlock full platform access.',
  TAP_TO_TAKE_PHOTO: 'Tap to take photo with your camera',
  DECLARATION: 'Declaration',
  DECLARATION_TEXT: 'I confirm that the documents uploaded are accurate, genuine, and belong to me.',
  FRONT_OF_ID: 'Front of ID',
  SELFIE_WITH_ID: 'Selfie with ID',
  USE_PHONE: 'Use Phone',
  BACK_TO_CURRENT: 'Back to Current Booking',
  COMPLETE_VERIFICATION: 'Complete Identity Verification',
  SUBMITTING: 'Submitting...',
  DONE: 'Done',
} as const;

// KYC toast messages
export const KYC_TOAST_MESSAGES = {
  SUCCESS_TITLE: 'Successfully submitted!',
  SUCCESS_DESCRIPTION: 'Your identity verification has been submitted for review.',
} as const;

// KYC file upload labels
export const KYC_FILE_LABELS = {
  UPLOAD_FRONT_ID: 'Upload Front of ID',
  FRONT_ID_DESCRIPTION: 'Take or upload a clear photo of the front of your government-issued ID (driver\'s license, passport, national ID card)',
  TAKE_SELFIE: 'Take Selfie with ID',
  SELFIE_DESCRIPTION: 'Take a selfie while holding your ID document next to your face. Both your face and ID should be clearly visible.',
} as const;

// Mobile design constants
export const KYC_MOBILE_DESIGN = {
  HERO_BACKGROUND: 'min-h-screen bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4 pb-24',
  SHIELD_GRADIENT: 'bg-ocean-blue',
  CARD_COMPLETED: 'border-success bg-gradient-to-br from-success/20 to-success/10 shadow-lg shadow-success/20',
  CARD_PENDING: 'border-2 border-dashed border-ocean-blue/30 hover:border-ocean-blue/60 bg-white/80 backdrop-blur-sm hover:shadow-lg',
  ICON_COMPLETED: 'bg-gradient-to-br from-success to-success-green text-white',
  ICON_PENDING: 'bg-gradient-to-br from-ocean-blue to-ocean-blue-light text-white',
  SUBMIT_BUTTON: 'w-full bg-ocean-blue hover:bg-ocean-blue-dark text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300',
} as const;

// Desktop wizard constants  
export const KYC_DESKTOP_DESIGN = {
  CONTAINER: 'min-h-screen bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4 pb-24 md:pb-4',
  PROGRESS_CONTAINER: 'max-w-2xl mx-auto',
  CARD_CLASS: 'bg-white/60 backdrop-blur-sm border-0 shadow-ios-sm rounded-ios-card',
} as const;

// ARIA labels
export const KYC_ARIA_LABELS = {
  STEP_RADIO: 'Select viewing time slot',
  DECLARATION_CHECKBOX: 'Accept document declaration',
  SUBMIT_BUTTON: 'Submit identity verification',
  MOBILE_CAMERA_INPUT: 'Upload photo using camera',
} as const;