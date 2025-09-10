import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCaptureModal } from './QRCaptureModal';
import { FileUploadZone } from './FileUploadZone';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ArrowLeft, ArrowRight, Upload, Camera, FileText, AlertTriangle, QrCode, Shield, Star, Zap } from 'lucide-react';
import { useKyc } from '@/hooks/useKyc';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

// Removed intro step as per requirements
const STEPS = [
  { id: 'id-front', title: 'Front of ID', icon: FileText, description: 'Photo of the front side of your government-issued ID' },
  { id: 'selfie', title: 'Selfie with ID', icon: Camera, description: 'Take a selfie while holding your ID next to your face' },
  { id: 'review', title: 'Review & Submit', icon: CheckCircle, description: 'Review your documents and submit for verification' }
];

interface KycWizardProps {
  onComplete: () => void;
}

export function EnhancedKycWizard({ onComplete }: KycWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [idFrontPreview, setIdFrontPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalType, setQRModalType] = useState<'id_front' | 'selfie'>('id_front');
  
  const { kycProfile, uploadFile, submitForReview, uploading, submitting, refresh } = useKyc();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleFileSelect = async (file: File, type: 'id_front' | 'selfie') => {
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
  };

  const handleFileRemove = (type: 'id_front' | 'selfie') => {
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
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return idFront !== null || kycProfile?.id_front_path; // Front ID
      case 1: return selfie !== null || kycProfile?.selfie_path; // Selfie with ID
      case 2: return declarationAccepted; // Review
      default: return false;
    }
  };

  const openQRModal = (type: 'id_front' | 'selfie') => {
    setQRModalType(type);
    setShowQRModal(true);
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await submitForReview();
      toast({
        title: "Successfully submitted!",
        description: "Your identity verification has been submitted for review.",
      });
      onComplete();
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (!isMobile) return; // Only for mobile
    
    // For mobile, directly trigger file input instead of QR modal
    if (stepIndex === 0) {
      // Trigger file input for ID front
      const fileInput = document.getElementById('mobile-id-front-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    } else if (stepIndex === 1) {
      // Trigger file input for selfie
      const fileInput = document.getElementById('mobile-selfie-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  };

  const isStepCompleted = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: return idFront !== null || kycProfile?.id_front_path;
      case 1: return selfie !== null || kycProfile?.selfie_path;
      default: return false;
    }
  };

  // Mobile One-Pager Design
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Hero Section with Shield Badge */}
          <div className="text-center space-y-4">
            <div className="relative">
              {/* Background Blob */}
              <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-br from-ocean-blue/20 to-success-green/20 blur-2xl"></div>
              
              {/* Shield Badge */}
              <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-ocean-blue to-success-green rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <Shield className="h-10 w-10 text-white" />
              </div>
              
              {/* Trust Indicators */}
              <div className="flex justify-center gap-2 mb-4">
                <div className="flex items-center gap-1 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium text-ocean-blue">
                  <Star className="h-3 w-3 fill-current" />
                  Secure
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium text-success-green">
                  <Zap className="h-3 w-3" />
                  Fast
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium text-ocean-blue">
                  <Shield className="h-3 w-3" />
                  Verified
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-ocean-blue">
              Identity Verification
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Complete both steps to verify your identity and unlock full platform access
            </p>
          </div>

          {/* Enhanced Step Cards */}
          <div className="space-y-4">
            {STEPS.slice(0, 2).map((step, index) => {
              const Icon = step.icon;
              const isCompleted = isStepCompleted(index);
              
              return (
                <Card 
                  key={step.id} 
                  className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    isCompleted 
                      ? 'border-success bg-gradient-to-br from-success/20 to-success/10 shadow-lg shadow-success/20'
                      : 'border-2 border-dashed border-ocean-blue/30 hover:border-ocean-blue/60 bg-white/80 backdrop-blur-sm hover:shadow-lg'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                          isCompleted 
                            ? 'bg-gradient-to-br from-success to-success-green text-white' 
                            : 'bg-gradient-to-br from-ocean-blue to-ocean-blue-light text-white'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-7 w-7" />
                          ) : (
                            <Icon className="h-7 w-7" />
                          )}
                        </div>
                        
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-ocean-blue">Step {index + 1}</h3>
                            {isCompleted && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-success text-white rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                <span className="text-xs font-semibold">Done</span>
                              </div>
                            )}
                          </div>
                          <h4 className="font-semibold text-base">{step.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center space-y-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-success/30' 
                            : 'bg-ocean-blue/20'
                        }`}>
                          <Camera className={`h-4 w-4 ${
                            isCompleted ? 'text-success' : 'text-ocean-blue'
                          }`} />
                        </div>
                        {!isCompleted && (
                          <span className="text-xs text-ocean-blue font-medium">Tap</span>
                        )}
                      </div>
                    </div>
                    
                    {!isCompleted && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-ocean-blue/5 to-success-green/5 rounded-lg border border-ocean-blue/20">
                        <div className="flex items-center justify-center gap-2">
                          <Camera className="h-4 w-4 text-ocean-blue" />
                          <p className="text-sm text-ocean-blue font-medium">
                            Tap to take photo with your camera
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Enhanced Review & Submit Section */}
          <Card className={`transition-all duration-300 ${
            isStepCompleted(0) && isStepCompleted(1) 
              ? 'border-success bg-gradient-to-br from-success/10 to-success/5 shadow-lg shadow-success/20' 
              : 'opacity-50 border-muted-foreground/30'
          }`}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-ocean-blue to-success-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-ocean-blue mb-2">Ready to Submit</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {isStepCompleted(0) && isStepCompleted(1) 
                      ? "Your documents are ready! Submit for verification to unlock full platform access."
                      : "Complete both steps above to submit your verification"
                    }
                  </p>
                </div>

                {isStepCompleted(0) && isStepCompleted(1) && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Front of ID</h4>
                        <img 
                          src={idFrontPreview || (kycProfile?.id_front_path ? `/api/kyc/preview/${kycProfile.id_front_path}` : '')} 
                          alt="Front of ID" 
                          className="w-full h-20 object-cover rounded border"
                        />
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Selfie with ID</h4>
                        <img 
                          src={selfiePreview || (kycProfile?.selfie_path ? `/api/kyc/preview/${kycProfile.selfie_path}` : '')} 
                          alt="Selfie with ID" 
                          className="w-full h-20 object-cover rounded border"
                        />
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id="declaration-mobile"
                        checked={declarationAccepted}
                        onCheckedChange={(checked) => setDeclarationAccepted(!!checked)}
                      />
                      <div className="space-y-1">
                        <label 
                          htmlFor="declaration-mobile" 
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          Declaration
                        </label>
                        <p className="text-xs text-muted-foreground">
                          I confirm that the documents uploaded are accurate, genuine, and belong to me.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={!declarationAccepted || submitting}
                      size="lg"
                      className="w-full bg-gradient-to-r from-ocean-blue to-success-green hover:from-ocean-blue-dark hover:to-success-green-dark text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5 mr-2" />
                          Complete Identity Verification
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hidden file inputs for mobile camera access */}
        <input
          id="mobile-id-front-upload"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0], 'id_front');
            }
          }}
          className="hidden"
        />
        <input
          id="mobile-selfie-upload"
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0], 'selfie');
            }
          }}
          className="hidden"
        />
      </div>
    );
  }

  // Desktop Step-by-Step Design (Original Flow)
  const renderDesktopStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Front of ID Document</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openQRModal('id_front')}
                className="flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Use Phone
              </Button>
            </div>
            
            <FileUploadZone
              label="Upload Front of ID"
              description="Take or upload a clear photo of the front of your government-issued ID (driver's license, passport, national ID card)"
              onFileSelect={(file) => handleFileSelect(file, 'id_front')}
              onFileRemove={() => handleFileRemove('id_front')}
              currentFile={idFront}
              previewUrl={idFrontPreview}
              isUploading={uploading}
            />
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Selfie with ID</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openQRModal('selfie')}
                className="flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Use Phone
              </Button>
            </div>
            
            <FileUploadZone
              label="Take Selfie with ID"
              description="Take a selfie while holding your ID document next to your face. Both your face and ID should be clearly visible."
              onFileSelect={(file) => handleFileSelect(file, 'selfie')}
              onFileRemove={() => handleFileRemove('selfie')}
              currentFile={selfie}
              previewUrl={selfiePreview}
              isUploading={uploading}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Thank You</h2>
              <p className="text-muted-foreground">
                Thank you for submitting your ID. We are now reviewing it and will send you a notification shortly
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">Front of ID</h3>
                {(idFrontPreview || kycProfile?.id_front_path) ? (
                  <img 
                    src={idFrontPreview || (kycProfile?.id_front_path ? `/api/kyc/preview/${kycProfile.id_front_path}` : '')} 
                    alt="Front of ID" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Selfie with ID</h3>
                {(selfiePreview || kycProfile?.selfie_path) ? (
                  <img 
                    src={selfiePreview || (kycProfile?.selfie_path ? `/api/kyc/preview/${kycProfile.selfie_path}` : '')} 
                    alt="Selfie with ID" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <Checkbox
                id="declaration"
                checked={declarationAccepted}
                onCheckedChange={(checked) => setDeclarationAccepted(!!checked)}
              />
              <div className="space-y-1">
                <label 
                  htmlFor="declaration" 
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Declaration
                </label>
                <p className="text-xs text-muted-foreground">
                  I confirm that the documents uploaded are accurate, genuine, and belong to me. 
                  I understand that providing false information may result in account suspension.
                </p>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Once submitted, your documents will be reviewed by our team. 
                You'll receive a notification once the review is complete.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4 pb-24 md:pb-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">Identity Verification</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center space-y-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-xs
                    ${isCompleted ? 'bg-success text-success-foreground' : 
                      isActive ? 'bg-primary text-primary-foreground' : 
                      'bg-muted text-muted-foreground'}
                  `}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs text-center max-w-16 ${
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center space-x-2">
              {(() => {
                const Icon = STEPS[currentStep].icon;
                return <Icon className="h-5 w-5" />;
              })()}
              <span>{STEPS[currentStep].title}</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pb-6">
            {renderDesktopStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6 pb-20 md:pb-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceedToNext() || submitting}
              className="bg-success hover:bg-success/90"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceedToNext()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCaptureModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        purpose={qrModalType}
        onUploadSuccess={refresh}
      />
    </div>
  );
}