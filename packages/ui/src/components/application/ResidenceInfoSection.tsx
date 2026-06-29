import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FORM_FIELDS, ARIA_LABELS } from '@mzanzihomes/common/constants/applicationConstants';
import type { FormData } from '@/hooks/useApplicationForm';

interface ResidenceInfoSectionProps {
  formData: FormData;
  onFieldChange: (field: keyof FormData, value: string) => void;
}

/**
 * Current residence information section of the rental application form
 * Collects current address, moving reason, and landlord references
 */
export function ResidenceInfoSection({ formData, onFieldChange }: ResidenceInfoSectionProps) {
  return (
    <div className="space-y-4" role="group" aria-label={ARIA_LABELS.RESIDENCE_INFO}>
      <h3 className="text-lg font-semibold">Current Residence</h3>
      
      <div>
        <Label htmlFor={FORM_FIELDS.CURRENT_ADDRESS}>Current Address *</Label>
        <Textarea
          id={FORM_FIELDS.CURRENT_ADDRESS}
          value={formData[FORM_FIELDS.CURRENT_ADDRESS]}
          onChange={(e) => onFieldChange(FORM_FIELDS.CURRENT_ADDRESS, e.target.value)}
          required
          aria-required="true"
          autoComplete="street-address"
          rows={3}
          placeholder="Enter your current full address"
        />
      </div>
      
      <div>
        <Label htmlFor={FORM_FIELDS.REASON_FOR_MOVING}>Reason for Moving</Label>
        <Textarea
          id={FORM_FIELDS.REASON_FOR_MOVING}
          value={formData[FORM_FIELDS.REASON_FOR_MOVING]}
          onChange={(e) => onFieldChange(FORM_FIELDS.REASON_FOR_MOVING, e.target.value)}
          rows={3}
          placeholder="Briefly explain why you're looking to move"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={FORM_FIELDS.PREVIOUS_LANDLORD_NAME}>Previous Landlord Name</Label>
          <Input
            id={FORM_FIELDS.PREVIOUS_LANDLORD_NAME}
            value={formData[FORM_FIELDS.PREVIOUS_LANDLORD_NAME]}
            onChange={(e) => onFieldChange(FORM_FIELDS.PREVIOUS_LANDLORD_NAME, e.target.value)}
            autoComplete="name"
            placeholder="Previous landlord or property manager"
          />
        </div>
        
        <div>
          <Label htmlFor={FORM_FIELDS.PREVIOUS_LANDLORD_CONTACT}>Previous Landlord Contact</Label>
          <Input
            id={FORM_FIELDS.PREVIOUS_LANDLORD_CONTACT}
            value={formData[FORM_FIELDS.PREVIOUS_LANDLORD_CONTACT]}
            onChange={(e) => onFieldChange(FORM_FIELDS.PREVIOUS_LANDLORD_CONTACT, e.target.value)}
            autoComplete="tel"
            placeholder="Phone number or email"
          />
        </div>
      </div>
    </div>
  );
}