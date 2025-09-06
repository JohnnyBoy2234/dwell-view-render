import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ArrowLeft, ArrowRight, Shield, Upload, Camera, FileText, AlertTriangle } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { useKyc } from '@/hooks/useKyc';
import { useToast } from '@/hooks/use-toast';

const STEPS = [
  { id: 'intro', title: 'Introduction', icon: Shield },
  { id: 'id-document', title: 'ID Document', icon: FileText },
  { id: 'selfie', title: 'Selfie with ID', icon: Camera },
  { id: 'review', title: 'Review & Submit', icon: CheckCircle }
];

interface KycWizardProps {
  onComplete: () => void;
}

export function KycWizard({ onComplete }: KycWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [idDocPreview, setIdDocPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  
  const { kycProfile, uploadFile, submitForReview, uploading, submitting } = useKyc();
  const { toast } = useToast();

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleIdDocumentSelect = async (file: File) => {
    try {
      setIdDocument(file);
      const preview = URL.createObjectURL(file);
      setIdDocPreview(preview);
      
      await uploadFile(file, 'id_doc');
    } catch (error) {
      console.error('Error uploading ID document:', error);
    }
  };

  const handleSelfieSelect = async (file: File) => {
    try {
      setSelfie(file);
      const preview = URL.createObjectURL(file);
      setSelfiePreview(preview);
      
      await uploadFile(file, 'selfie');
    } catch (error) {
      console.error('Error uploading selfie:', error);
    }
  };

  const handleRemoveIdDocument = () => {
    setIdDocument(null);
    if (idDocPreview) {
      URL.revokeObjectURL(idDocPreview);
      setIdDocPreview('');
    }
  };

  const handleRemoveSelfie = () => {
    setSelfie(null);
    if (selfiePreview) {
      URL.revokeObjectURL(selfiePreview);
      setSelfiePreview('');
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return true; // Intro
      case 1: return idDocument !== null; // ID Document
      case 2: return selfie !== null; // Selfie
      case 3: return declarationAccepted; // Review
      default: return false;
    }
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
                We keep everyone safe by verifying identity. You'll upload your ID document 
                and take a selfie while holding your ID.
              </p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Make sure you have your government-issued ID ready 
                and good lighting for clear photos.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 border rounded-lg space-y-2">
                <Upload className="h-6 w-6 text-primary mx-auto" />
                <h3 className="font-medium">Step 1: ID Document</h3>
                <p className="text-muted-foreground">
                  Upload a clear photo of your government-issued ID
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
              <p>✓ Good lighting with no shadows or glare</p>
              <p>✓ All text clearly readable</p>
              <p>✓ Full document edges visible</p>
              <p>✓ No HEIC format (use JPEG, PNG, or WebP)</p>
            </div>
          </div>
        );

      case 1:
        return (
          <FileUploadZone
            label="Upload Your ID Document"
            description="Please upload a clear photo of your government-issued ID (driver's license, passport, national ID card)"
            onFileSelect={handleIdDocumentSelect}
            onFileRemove={handleRemoveIdDocument}
            currentFile={idDocument}
            previewUrl={idDocPreview}
            isUploading={uploading}
          />
        );

      case 2:
        return (
          <FileUploadZone
            label="Upload Selfie with ID"
            description="Take a selfie while holding your ID document next to your face. Both your face and ID should be clearly visible."
            onFileSelect={handleSelfieSelect}
            onFileRemove={handleRemoveSelfie}
            currentFile={selfie}
            previewUrl={selfiePreview}
            isUploading={uploading}
          />
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
                <h3 className="font-medium">ID Document</h3>
                {idDocPreview ? (
                  <img 
                    src={idDocPreview} 
                    alt="ID Document" 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Selfie with ID</h3>
                {selfiePreview ? (
                  <img 
                    src={selfiePreview} 
                    alt="Selfie with ID" 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
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
      <div className="max-w-2xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">Identity Verification</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between mt-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center space-x-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs
                    ${isCompleted ? 'bg-success text-success-foreground' : 
                      isActive ? 'bg-primary text-primary-foreground' : 
                      'bg-muted text-muted-foreground'}
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`hidden md:block text-sm ${
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
    </div>
  );
}