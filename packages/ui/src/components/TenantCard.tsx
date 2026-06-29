import { UserTypeCard } from './landing/UserTypeCard';
import { TENANT_DATA, COLOR_SCHEMES } from '@mzanzihomes/common/constants/howItWorksConstants';

/**
 * Tenant card component for displaying tenant-specific process steps
 * Refactored to use shared UserTypeCard component with tenant data
 */
const TenantCard: React.FC = () => {
  return (
    <UserTypeCard 
      data={TENANT_DATA} 
      colors={COLOR_SCHEMES.TENANT} 
      type="tenant"
    />
  );
};

export default TenantCard;