import { Card, CardContent } from "@/components/ui/card";
import { SAFE_RENTING_STYLES } from '@mzanzihomes/common/constants/safeRentingConstants';
import type { SafetyFeature } from '@mzanzihomes/common/constants/safeRentingConstants';

interface SafetyFeatureCardProps {
  feature: SafetyFeature;
}

/**
 * Individual safety feature card component
 * Displays a single safety feature with icon, title, and description
 */
export function SafetyFeatureCard({ feature }: SafetyFeatureCardProps) {
  const IconComponent = feature.icon;

  return (
    <Card className={SAFE_RENTING_STYLES.CARD}>
      <CardContent className={SAFE_RENTING_STYLES.CARD_CONTENT}>
        <div className={SAFE_RENTING_STYLES.FEATURE_ICON_CONTAINER}>
          <IconComponent 
            className={SAFE_RENTING_STYLES.FEATURE_ICON}
            aria-hidden="true"
          />
        </div>
        <h3 className={SAFE_RENTING_STYLES.FEATURE_TITLE}>
          {feature.title}
        </h3>
        <p className={SAFE_RENTING_STYLES.FEATURE_DESCRIPTION}>
          {feature.description}
        </p>
      </CardContent>
    </Card>
  );
}