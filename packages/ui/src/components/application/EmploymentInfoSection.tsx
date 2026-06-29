import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FORM_FIELDS, EMPLOYMENT_STATUS_OPTIONS, ARIA_LABELS } from '@mzanzihomes/common/constants/applicationConstants';
import type { FormData } from '@/hooks/useApplicationForm';

interface EmploymentInfoSectionProps {
  formData: FormData;
  onFieldChange: (field: keyof FormData, value: string) => void;
}

/**
 * Employment information section of the rental application form
 * Collects employment status, income, and job details
 */
export function EmploymentInfoSection({ formData, onFieldChange }: EmploymentInfoSectionProps) {
  return (
    <div className="space-y-4" role="group" aria-label={ARIA_LABELS.EMPLOYMENT_INFO}>
      <h3 className="text-lg font-semibold">Employment Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={FORM_FIELDS.EMPLOYMENT_STATUS}>Employment Status *</Label>
          <Select 
            value={formData[FORM_FIELDS.EMPLOYMENT_STATUS]} 
            onValueChange={(value) => onFieldChange(FORM_FIELDS.EMPLOYMENT_STATUS, value)}
            required
          >
            <SelectTrigger id={FORM_FIELDS.EMPLOYMENT_STATUS} aria-required="true">
              <SelectValue placeholder="Select employment status" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor={FORM_FIELDS.NET_MONTHLY_INCOME}>Net Monthly Income (R)</Label>
          <Input
            id={FORM_FIELDS.NET_MONTHLY_INCOME}
            type="number"
            min="0"
            step="0.01"
            value={formData[FORM_FIELDS.NET_MONTHLY_INCOME]}
            onChange={(e) => onFieldChange(FORM_FIELDS.NET_MONTHLY_INCOME, e.target.value)}
            autoComplete="off"
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={FORM_FIELDS.JOB_TITLE}>Job Title</Label>
          <Input
            id={FORM_FIELDS.JOB_TITLE}
            value={formData[FORM_FIELDS.JOB_TITLE]}
            onChange={(e) => onFieldChange(FORM_FIELDS.JOB_TITLE, e.target.value)}
            autoComplete="organization-title"
          />
        </div>
        
        <div>
          <Label htmlFor={FORM_FIELDS.COMPANY_NAME}>Company Name</Label>
          <Input
            id={FORM_FIELDS.COMPANY_NAME}
            value={formData[FORM_FIELDS.COMPANY_NAME]}
            onChange={(e) => onFieldChange(FORM_FIELDS.COMPANY_NAME, e.target.value)}
            autoComplete="organization"
          />
        </div>
      </div>
    </div>
  );
}