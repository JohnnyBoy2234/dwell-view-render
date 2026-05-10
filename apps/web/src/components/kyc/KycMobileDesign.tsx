import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageWithSkeleton } from '@/components/ui/ImageWithSkeleton';
import { Shield, CheckCircle, Camera } from 'lucide-react';
import { useKyc } from '@/hooks/useKyc';
import { 
  KYC_STEPS, 
  TRUST_INDICATORS, 
  KYC_LABELS, 
  KYC_MOBILE_DESIGN,
  KycStepType 
} from '@/constants/kycConstants';
import type { KycWizardState, KycWizardActions } from '@/hooks/useKycWizard';

interface KycMobileDesignProps extends KycWizardState, KycWizardActions {
  kycProfile: any;
  submitting: boolean;
}

/**
 * Mobile-optimized KYC wizard design component
 */
export function KycMobileDesign({
  idFront,
  selfie,
  idFrontPreview,
  selfiePreview,
  declarationAccepted,
  handleStepClick,
  handleFileSelect,
  handleSubmit,
  setDeclarationAccepted,
  isStepCompleted,
  kycProfile,
  submitting,
}: KycMobileDesignProps) {
  return (
    <div className={KYC_MOBILE_DESIGN.HERO_BACKGROUND}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Hero Section with Shield Badge */}
        <div className="text-center space-y-4">
          <div className="relative">
            {/* Background Blob */}
            <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-ocean-blue/20 blur-2xl"></div>
            
            {/* Shield Badge */}
            <div className={`relative mx-auto w-20 h-20 ${KYC_MOBILE_DESIGN.SHIELD_GRADIENT} rounded-2xl flex items-center justify-center shadow-lg mb-4`}>
              <Shield className="h-10 w-10 text-white" />
            </div>
            
            {/* Trust Indicators */}
            <div className="flex justify-center gap-2 mb-4">
              {TRUST_INDICATORS.map((indicator, index) => {
                const Icon = indicator.icon;
                return (
                  <div 
                    key={index}
                    className={`flex items-center gap-1 px-3 py-1 ${indicator.bgColor} backdrop-blur-sm rounded-full text-xs font-medium ${indicator.color}`}
                  >
                    <Icon className="h-3 w-3 fill-current" />
                    {indicator.label}
                  </div>
                );
              })}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-ocean-blue">
            {KYC_LABELS.IDENTITY_VERIFICATION}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {KYC_LABELS.COMPLETE_BOTH_STEPS}
          </p>
        </div>

        {/* Enhanced Step Cards */}
        <div className="space-y-4">
          {KYC_STEPS.slice(0, 2).map((step, index) => {
            const Icon = step.icon;
            const isCompleted = isStepCompleted(index);
            
            return (
              <Card 
                key={step.id} 
                className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  isCompleted 
                    ? KYC_MOBILE_DESIGN.CARD_COMPLETED
                    : KYC_MOBILE_DESIGN.CARD_PENDING
                }`}
                onClick={() => handleStepClick(index)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                        isCompleted 
                          ? KYC_MOBILE_DESIGN.ICON_COMPLETED
                          : KYC_MOBILE_DESIGN.ICON_PENDING
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-7 w-7" />
                        ) : (
                          <Icon className="h-7 w-7" />
                        )}
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-ocean-blue">
                            {KYC_LABELS.STEP_LABEL(index + 1, 2)}
                          </h3>
                          {isCompleted && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-success text-white rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-xs font-semibold">{KYC_LABELS.DONE}</span>
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
                    <div className="mt-4 p-3 bg-ocean-blue/5 rounded-lg border border-ocean-blue/20">
                      <div className="flex items-center justify-center gap-2">
                        <Camera className="h-4 w-4 text-ocean-blue" />
                        <p className="text-sm text-ocean-blue font-medium">
                          {KYC_LABELS.TAP_TO_TAKE_PHOTO}
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
                <div className="w-16 h-16 bg-ocean-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-ocean-blue mb-2">
                  {KYC_LABELS.READY_TO_SUBMIT}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isStepCompleted(0) && isStepCompleted(1) 
                    ? KYC_LABELS.DOCUMENTS_READY_MESSAGE
                    : KYC_LABELS.COMPLETE_STEPS_MESSAGE
                  }
                </p>
              </div>

              {isStepCompleted(0) && isStepCompleted(1) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{KYC_LABELS.FRONT_OF_ID}</h4>
                      <ImageWithSkeleton 
                        src={idFrontPreview || (kycProfile?.id_front_path ? `/api/kyc/preview/${kycProfile.id_front_path}` : '')} 
                        alt={KYC_LABELS.FRONT_OF_ID} 
                        className="w-full h-20 object-cover rounded border"
                      />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{KYC_LABELS.SELFIE_WITH_ID}</h4>
                      <ImageWithSkeleton 
                        src={selfiePreview || (kycProfile?.selfie_path ? `/api/kyc/preview/${kycProfile.selfie_path}` : '')} 
                        alt={KYC_LABELS.SELFIE_WITH_ID} 
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
                        {KYC_LABELS.DECLARATION}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {KYC_LABELS.DECLARATION_TEXT}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!declarationAccepted || submitting}
                    size="lg"
                    className={KYC_MOBILE_DESIGN.SUBMIT_BUTTON}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        {KYC_LABELS.SUBMITTING}
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 mr-2" />
                        {KYC_LABELS.COMPLETE_VERIFICATION}
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