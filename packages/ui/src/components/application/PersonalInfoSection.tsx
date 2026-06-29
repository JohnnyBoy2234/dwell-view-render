import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FORM_FIELDS, ARIA_LABELS } from '@mzanzihomes/common/constants/applicationConstants';
import type { FormData } from '@/hooks/useApplicationForm';

interface PersonalInfoSectionProps {
  formData: FormData;
  onFieldChange: (field: keyof FormData, value: string) => void;
}

/**
 * Personal information section of the rental application form
 * Collects name, ID, and phone information
 */
export function PersonalInfoSection({ formData, onFieldChange }: PersonalInfoSectionProps) {
  return (
    <div className="space-y-4" role="group" aria-label={ARIA_LABELS.PERSONAL_INFO}>
      <h3 className="text-lg font-semibold">Personal Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor={FORM_FIELDS.FIRST_NAME}>First Name *</Label>
          <Input
            id={FORM_FIELDS.FIRST_NAME}
            value={formData[FORM_FIELDS.FIRST_NAME]}
            onChange={(e) => onFieldChange(FORM_FIELDS.FIRST_NAME, e.target.value)}
            required
            aria-required="true"
            autoComplete="given-name"
          />
        </div>
        
        <div>
          <Label htmlFor={FORM_FIELDS.MIDDLE_NAME}>Middle Name</Label>
          <Input
            id={FORM_FIELDS.MIDDLE_NAME}
            value={formData[FORM_FIELDS.MIDDLE_NAME]}
            onChange={(e) => onFieldChange(FORM_FIELDS.MIDDLE_NAME, e.target.value)}
            autoComplete="additional-name"
          />
        </div>
        
        <div>
          <Label htmlFor={FORM_FIELDS.LAST_NAME}>Last Name *</Label>
          <Input
            id={FORM_FIELDS.LAST_NAME}
            value={formData[FORM_FIELDS.LAST_NAME]}
            onChange={(e) => onFieldChange(FORM_FIELDS.LAST_NAME, e.target.value)}
            required
            aria-required="true"
            autoComplete="family-name"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={FORM_FIELDS.ID_NUMBER}>ID Number *</Label>
          <Input
            id={FORM_FIELDS.ID_NUMBER}
            value={formData[FORM_FIELDS.ID_NUMBER]}
            onChange={(e) => onFieldChange(FORM_FIELDS.ID_NUMBER, e.target.value)}
            required
            aria-required="true"
            autoComplete="off"
          />
        </div>
        
        <div>
          <Label htmlFor={FORM_FIELDS.PHONE}>Phone Number *</Label>
          <Input
            id={FORM_FIELDS.PHONE}
            type="tel"
            value={formData[FORM_FIELDS.PHONE]}
            onChange={(e) => onFieldChange(FORM_FIELDS.PHONE, e.target.value)}
            required
            aria-required="true"
            autoComplete="tel"
          />
        </div>
      </div>
    </div>
  );
}