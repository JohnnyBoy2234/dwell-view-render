import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { ImageWithSkeleton } from '@mzanzihomes/ui/components/ImageWithSkeleton';
import { ArrowLeft, ArrowRight, CheckCircle, QrCode } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { QRCaptureModal } from './QRCaptureModal';
import { 
  KYC_STEPS, 
  KYC_LABELS, 
  KYC_FILE_LABELS, 
  KYC_DESKTOP_DESIGN,
  KycStepType 
} from '@mzanzihomes/common/constants/kycConstants';
import type { KycWizardState, KycWizardActions } from '@/hooks/useKycWizard';

interface KycDesktopDesignProps extends KycWizardState, KycWizardActions {
  kycProfile: any;
  uploading: boolean;
  submitting: boolean;
  refresh: () => void;
}

/**
 * Desktop KYC wizard design component with step-by-step flow
 */
export function KycDesktopDesign({
  currentStep,
  idFront,
  selfie,
  idFrontPreview,
  selfiePreview,
  declarationAccepted,
  showQRModal,
  qrModalType,
  handleFileSelect,
  handleFileRemove,
  handleNext,
  handlePrevious,
  handleSubmit,
  openQRModal,
  setShowQRModal,
  setDeclarationAccepted,
  canProceedToNext,
  kycProfile,
  uploading,
  submitting,
  refresh,
}: KycDesktopDesignProps) {
  const progress = ((currentStep + 1) / KYC_STEPS.length) * 100;

  const renderStepContent = () => {
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
                {KYC_LABELS.USE_PHONE}
              </Button>
            </div>
            
            <FileUploadZone
              label={KYC_FILE_LABELS.UPLOAD_FRONT_ID}
              description={KYC_FILE_LABELS.FRONT_ID_DESCRIPTION}
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
                {KYC_LABELS.USE_PHONE}
              </Button>
            </div>
            
            <FileUploadZone
              label={KYC_FILE_LABELS.TAKE_SELFIE}
              description={KYC_FILE_LABELS.SELFIE_DESCRIPTION}
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
              <h2 className="text-2xl font-bold mb-2">{KYC_LABELS.READY_TO_SUBMIT}</h2>
              <p className="text-muted-foreground">
                Please review your uploaded documents and confirm submission
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">{KYC_LABELS.FRONT_OF_ID}</h3>
                {idFrontPreview ? (
                  <ImageWithSkeleton 
                    src={idFrontPreview} 
                    alt={KYC_LABELS.FRONT_OF_ID} 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground">No preview available</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">{KYC_LABELS.SELFIE_WITH_ID}</h3>
                {selfiePreview ? (
                  <ImageWithSkeleton 
                    src={selfiePreview} 
                    alt={KYC_LABELS.SELFIE_WITH_ID} 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground">No preview available</span>
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
                  {KYC_LABELS.DECLARATION}
                </label>
                <p className="text-xs text-muted-foreground">
                  {KYC_LABELS.DECLARATION_TEXT}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={KYC_DESKTOP_DESIGN.CONTAINER}>
      <div className={KYC_DESKTOP_DESIGN.PROGRESS_CONTAINER}>
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">{KYC_LABELS.IDENTITY_VERIFICATION}</h1>
            <span className="text-sm text-muted-foreground">
              {KYC_LABELS.STEP_LABEL(currentStep + 1, KYC_STEPS.length)}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between mt-2">
            {KYC_STEPS.map((step, index) => {
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
                const Icon = KYC_STEPS[currentStep].icon;
                return <Icon className="h-5 w-5" />;
              })()}
              <span>{KYC_STEPS[currentStep].title}</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pb-6">
            {renderStepContent()}
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

          {currentStep === KYC_STEPS.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceedToNext() || submitting}
              className="bg-success hover:bg-success/90"
            >
              {submitting ? KYC_LABELS.SUBMITTING : 'Submit for Review'}
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

        {/* QR Code Modal */}
        <QRCaptureModal
          open={showQRModal}
          onOpenChange={setShowQRModal}
          purpose={qrModalType}
          onUploadSuccess={refresh}
        />
      </div>
    </div>
  );
}