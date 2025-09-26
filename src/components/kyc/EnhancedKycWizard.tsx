import { useIsMobile } from '@/hooks/use-mobile';
import { useKyc } from '@/hooks/useKyc';
import { useKycWizard } from '@/hooks/useKycWizard';
import { KycMobileDesign } from './KycMobileDesign';
import { KycDesktopDesign } from './KycDesktopDesign';

interface KycWizardProps {
  onComplete: () => void;
}

/**
 * Enhanced KYC wizard component with responsive design
 * Provides mobile-first and desktop experiences for identity verification
 */
export function EnhancedKycWizard({ onComplete }: KycWizardProps) {
  const isMobile = useIsMobile();
  const { kycProfile, uploading, submitting, refresh } = useKyc();
  const wizardState = useKycWizard({ onComplete });

  if (isMobile) {
    return (
      <KycMobileDesign
        {...wizardState}
        kycProfile={kycProfile}
        submitting={submitting}
      />
    );
  }

  return (
    <KycDesktopDesign
      {...wizardState}
      kycProfile={kycProfile}
      uploading={uploading}
      submitting={submitting}
      refresh={refresh}
    />
  );
}