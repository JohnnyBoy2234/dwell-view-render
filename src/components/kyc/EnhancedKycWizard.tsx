import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCaptureModal } from './QRCaptureModal';
import { FileUploadZone } from './FileUploadZone';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ArrowLeft, ArrowRight, Shield, Upload, Camera, FileText, AlertTriangle, QrCode, Smartphone } from 'lucide-react';
import { useKyc } from '@/hooks/useKyc';
import { useToast } from '@/hooks/use-toast';

const STEPS = [
  { id: 'intro', title: 'Introduction', icon: Shield },
  { id: 'id-front', title: 'Front of ID', icon: FileText },
  { id: 'selfie', title: 'Selfie with ID', icon: Camera },
  { id: 'review', title: 'Review & Submit', icon: CheckCircle }
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
      case 0: return true; // Intro
      case 1: return idFront !== null || kycProfile?.id_front_path; // Front ID
      case 2: return selfie !== null || kycProfile?.selfie_path; // Selfie with ID
      case 3: return declarationAccepted; // Review
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Identity Verification</h2>
              <p className="text-muted-foreground">
                Complete your identity verification to access all features. You'll need to upload photos of both sides of your ID and take a selfie.
              </p>
            </div>

            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                <strong>Use Your Phone for Best Results:</strong> Each step includes a QR code to easily take high-quality photos with your phone camera.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 border rounded-lg space-y-2">
                <FileText className="h-6 w-6 text-primary mx-auto" />
                <h3 className="font-medium">Step 1: Front of ID</h3>
                <p className="text-muted-foreground">
                  Photo of the front side of your government-issued ID
                </p>
              </div>
              
              <div className="p-4 border rounded-lg space-y-2">
                <Camera className="h-6 w-6 text-primary mx-auto" />
                <h3 className="font-medium">Step 2: Selfie with ID</h3>
                <p className="text-muted-foreground">
                  Take a selfie while holding your ID next to your face
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ Use good lighting with no shadows or glare</p>
              <p>✓ Ensure all text is clearly readable</p>
              <p>✓ Keep document flat with all edges visible</p>
              <p>✓ For selfies: both your face and ID should be clearly visible</p>
            </div>
          </div>
        );

      case 1:
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

      case 2:
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

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Review & Submit</h2>
              <p className="text-muted-foreground">
                Please review your uploaded documents and confirm submission
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
    <div className="min-h-screen bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4">
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
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
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