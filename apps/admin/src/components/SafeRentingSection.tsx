import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { SafetyFeatureCard } from './landing/SafetyFeatureCard';
import { 
  SAFETY_FEATURES, 
  SAFE_RENTING_CONTENT, 
  SAFE_RENTING_STYLES 
} from '@/constants/safeRentingConstants';

/**
 * Safe renting section component highlighting security features
 * Displays safety features with call-to-action
 */
export function SafeRentingSection() {
  return (
    <section className={SAFE_RENTING_STYLES.SECTION}>
      <div className={SAFE_RENTING_STYLES.HEADER}>
        <div className="flex justify-center mb-6">
          <div className={SAFE_RENTING_STYLES.ICON_CONTAINER}>
            <Shield className={SAFE_RENTING_STYLES.MAIN_ICON} />
          </div>
        </div>
        <h2 className={SAFE_RENTING_STYLES.TITLE}>
          {SAFE_RENTING_CONTENT.TITLE}
        </h2>
        <p className={SAFE_RENTING_STYLES.SUBTITLE}>
          {SAFE_RENTING_CONTENT.SUBTITLE}
        </p>
      </div>

      <div className={SAFE_RENTING_STYLES.GRID}>
        {SAFETY_FEATURES.map((feature, index) => (
          <SafetyFeatureCard 
            key={`${feature.title}-${index}`} 
            feature={feature} 
          />
        ))}
      </div>

      <div className={SAFE_RENTING_STYLES.CTA_CONTAINER}>
        <Button 
          asChild 
          size="lg" 
          className={SAFE_RENTING_STYLES.CTA_BUTTON}
        >
          <Link to={SAFE_RENTING_CONTENT.CTA_LINK}>
            {SAFE_RENTING_CONTENT.CTA_TEXT}
          </Link>
        </Button>
      </div>
    </section>
  );
}