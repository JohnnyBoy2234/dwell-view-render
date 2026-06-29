import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HOW_IT_WORKS_STYLES } from '@mzanzihomes/common/constants/howItWorksConstants';

interface UserTypeToggleProps {
  isTenant: boolean;
  onToggle: () => void;
}

/**
 * Toggle component for switching between tenant and landlord views
 * Only visible on mobile devices
 */
export function UserTypeToggle({ isTenant, onToggle }: UserTypeToggleProps) {
  return (
    <div className={HOW_IT_WORKS_STYLES.MOBILE_TOGGLE}>
      <div className={HOW_IT_WORKS_STYLES.TOGGLE_CONTAINER}>
        <Label
          htmlFor="user-type-toggle"
          className={`${HOW_IT_WORKS_STYLES.TOGGLE_LABEL_BASE} ${
            isTenant 
              ? HOW_IT_WORKS_STYLES.TOGGLE_ACTIVE_TENANT
              : HOW_IT_WORKS_STYLES.TOGGLE_INACTIVE
          }`}
        >
          For Tenants
        </Label>
        <Switch
          id="user-type-toggle"
          checked={!isTenant}
          onCheckedChange={onToggle}
          className={HOW_IT_WORKS_STYLES.TOGGLE_SWITCH}
        />
        <Label
          htmlFor="user-type-toggle"
          className={`${HOW_IT_WORKS_STYLES.TOGGLE_LABEL_BASE} ${
            !isTenant 
              ? HOW_IT_WORKS_STYLES.TOGGLE_ACTIVE_LANDLORD
              : HOW_IT_WORKS_STYLES.TOGGLE_INACTIVE
          }`}
        >
          For Landlords
        </Label>
      </div>
    </div>
  );
}