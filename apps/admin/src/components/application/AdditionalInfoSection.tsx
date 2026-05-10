import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FORM_FIELDS, ARIA_LABELS } from '@/constants/applicationConstants';
import type { FormData } from '@/hooks/useApplicationForm';

interface AdditionalInfoSectionProps {
  formData: FormData;
  onFieldChange: (field: keyof FormData, value: string | boolean) => void;
}

/**
 * Additional information section of the rental application form
 * Collects pet information and screening consent
 */
export function AdditionalInfoSection({ formData, onFieldChange }: AdditionalInfoSectionProps) {
  return (
    <div className="space-y-4" role="group" aria-label={ARIA_LABELS.ADDITIONAL_INFO}>
      <h3 className="text-lg font-semibold">Additional Information</h3>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id={FORM_FIELDS.HAS_PETS}
          checked={formData[FORM_FIELDS.HAS_PETS]}
          onCheckedChange={(checked) => onFieldChange(FORM_FIELDS.HAS_PETS, checked as boolean)}
        />
        <Label htmlFor={FORM_FIELDS.HAS_PETS}>I have pets</Label>
      </div>
      
      {formData[FORM_FIELDS.HAS_PETS] && (
        <div>
          <Label htmlFor={FORM_FIELDS.PET_DETAILS}>Pet Details</Label>
          <Textarea
            id={FORM_FIELDS.PET_DETAILS}
            value={formData[FORM_FIELDS.PET_DETAILS]}
            onChange={(e) => onFieldChange(FORM_FIELDS.PET_DETAILS, e.target.value)}
            rows={3}
            placeholder="Please describe your pets (type, breed, age, weight, etc.)"
          />
        </div>
      )}
      
      <div className="flex items-start space-x-3 p-4 border rounded-lg">
        <Checkbox
          id={FORM_FIELDS.SCREENING_CONSENT}
          checked={formData[FORM_FIELDS.SCREENING_CONSENT]}
          onCheckedChange={(checked) => onFieldChange(FORM_FIELDS.SCREENING_CONSENT, checked as boolean)}
          required
          aria-required="true"
        />
        <div className="space-y-1">
          <Label 
            htmlFor={FORM_FIELDS.SCREENING_CONSENT}
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Screening Consent *
          </Label>
          <p className="text-xs text-muted-foreground">
            I consent to background and credit checks as part of the rental application process. 
            I understand this may include verification of employment, income, rental history, 
            and creditworthiness. I confirm that all information provided is accurate and complete.
          </p>
        </div>
      </div>
    </div>
  );
}