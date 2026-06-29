import React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { UserTypeCard } from './landing/UserTypeCard';
import { UserTypeToggle } from './landing/UserTypeToggle';
import { useUserTypeToggle } from '@/hooks/useUserTypeToggle';
import { 
  TENANT_DATA, 
  LANDLORD_DATA, 
  COLOR_SCHEMES, 
  HOW_IT_WORKS_CONTENT,
  HOW_IT_WORKS_STYLES
} from '@mzanzihomes/common/constants/howItWorksConstants';

/**
 * How It Works section component
 * Shows the process for both tenants and landlords with mobile toggle
 */
const HowItWorks: React.FC = () => {
  const { isTenant, toggle } = useUserTypeToggle('tenant');

  return (
    <div>
      <section className={HOW_IT_WORKS_STYLES.SECTION}>
        <div className={HOW_IT_WORKS_STYLES.CONTAINER}>
          <SectionHeader
            title={HOW_IT_WORKS_CONTENT.TITLE}
            subtitle={HOW_IT_WORKS_CONTENT.SUBTITLE}
            showTagline={false}
          />
        </div>

        <UserTypeToggle isTenant={isTenant} onToggle={toggle} />

        <div className={HOW_IT_WORKS_STYLES.CARDS_SECTION}>
          <div className={HOW_IT_WORKS_STYLES.CARDS_CONTAINER}>
            <div className={HOW_IT_WORKS_STYLES.CARDS_WRAPPER}>
              <div className={HOW_IT_WORKS_STYLES.MOBILE_CARD}>
                {isTenant ? (
                  <UserTypeCard 
                    data={TENANT_DATA} 
                    colors={COLOR_SCHEMES.TENANT} 
                    type="tenant"
                  />
                ) : (
                  <UserTypeCard 
                    data={LANDLORD_DATA} 
                    colors={COLOR_SCHEMES.LANDLORD} 
                    type="landlord"
                  />
                )}
              </div>
              <div className={HOW_IT_WORKS_STYLES.DESKTOP_CARDS}>
                <UserTypeCard 
                  data={TENANT_DATA} 
                  colors={COLOR_SCHEMES.TENANT} 
                  type="tenant"
                />
                <UserTypeCard 
                  data={LANDLORD_DATA} 
                  colors={COLOR_SCHEMES.LANDLORD} 
                  type="landlord"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
