import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Label } from '@mzanzihomes/ui/components/label';
import { Pencil } from 'lucide-react';
import { EMPLOYMENT_STATUS_OPTIONS, RISK_QUESTIONS } from '@mzanzihomes/common/constants/applicationConstants';
import type { ApplicationFormData, SectionKey } from '../../types';
import { validateSection } from '../../validation';
import { DocumentRow, type StepProps } from './shared';

interface ReviewStepProps extends StepProps {
  onEdit: (step: number) => void;
  confirmations: { accurate: boolean; terms: boolean };
  setConfirmations: (patch: Partial<{ accurate: boolean; terms: boolean }>) => void;
}

const SECTION_STEPS: { key: SectionKey; title: string; step: number }[] = [
  { key: 'personal', title: 'Personal and Identity Information', step: 0 },
  { key: 'identity', title: 'Identity Verification', step: 1 },
  { key: 'address', title: 'Residential Address', step: 2 },
  { key: 'credit', title: 'Credit Report and Consent', step: 3 },
  { key: 'employment', title: 'Employment and Income', step: 4 },
  { key: 'household', title: 'Household and Pets', step: 5 },
  { key: 'risk', title: 'Additional Questions', step: 6 }
];

const Item = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </div>
  ) : null;

function sectionSummary(key: SectionKey, d: ApplicationFormData): React.ReactNode {
  switch (key) {
    case 'personal':
      return (
        <>
          <Item label="Name" value={[d.personal.first_name, d.personal.middle_name, d.personal.last_name].filter(Boolean).join(' ')} />
          <Item label="Phone" value={d.personal.phone} />
          <Item label="Email" value={d.personal.email} />
        </>
      );
    case 'identity':
      return (
        <>
          <Item label="Document" value={d.identity.id_type === 'sa_id' ? 'South African ID' : 'Passport'} />
          <Item label="Number" value={d.identity.id_number} />
          <Item label="Date of birth" value={d.identity.date_of_birth} />
          <Item label="Nationality" value={d.identity.nationality} />
          {d.identity.document && <DocumentRow doc={d.identity.document} />}
        </>
      );
    case 'address':
      return (
        <>
          <Item
            label="Address"
            value={[d.address.line1, d.address.line2, d.address.suburb, d.address.city, d.address.province, d.address.postal_code, d.address.country]
              .filter(Boolean)
              .join(', ')}
          />
          <Item label="Time at address" value={d.address.years_at_address} />
          <Item label="Residential status" value={d.address.residential_status} />
          {d.address.proof_document && <DocumentRow doc={d.address.proof_document} />}
        </>
      );
    case 'credit':
      return (
        <>
          <Item label="Consent" value={d.credit.consent ? 'Provided' : 'Not provided'} />
          {d.credit.report_documents.map((doc) => (
            <DocumentRow key={doc.path} doc={doc} />
          ))}
        </>
      );
    case 'employment': {
      const status = EMPLOYMENT_STATUS_OPTIONS.find((o) => o.value === d.employment.status)?.label;
      return (
        <>
          <Item label="Status" value={status} />
          <Item label="Employer" value={d.employment.employer_name} />
          <Item label="Business" value={d.employment.business_name} />
          <Item label="Institution" value={d.employment.institution} />
          <Item label="Net monthly income" value={d.employment.net_monthly_income && `R ${d.employment.net_monthly_income}`} />
          {d.employment.income_documents.map((doc) => (
            <DocumentRow key={doc.path} doc={doc} />
          ))}
        </>
      );
    }
    case 'household':
      return (
        <>
          <Item label="Occupants" value={`${d.household.total_occupants} total (${d.household.adults} adults, ${d.household.children} children)`} />
          <Item label="Pets" value={d.household.has_pets ? `${d.household.pets.length}` : 'None'} />
        </>
      );
    case 'risk':
      return (
        <>
          {RISK_QUESTIONS.map((q) => {
            const a = d.risk.answers[q.id];
            return <Item key={q.id} label={q.question} value={a?.answer ? a.answer.toUpperCase() : undefined} />;
          })}
        </>
      );
  }
}

export function ReviewStep({ data, errors, onEdit, confirmations, setConfirmations }: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Review and Submit</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Check each section below. Use Edit to fix anything before you submit.
        </p>
      </div>

      {SECTION_STEPS.map(({ key, title, step }) => {
        const sectionErrors = validateSection(key, data);
        const missing = Object.keys(sectionErrors).length > 0;
        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{title}</CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  {missing && <Badge variant="destructive">Incomplete</Badge>}
                  <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sectionSummary(key, data)}
              {missing && (
                <p className="text-xs text-destructive">{Object.values(sectionErrors)[0]}</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Declaration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm_accurate"
              checked={confirmations.accurate}
              onCheckedChange={(c) => setConfirmations({ accurate: !!c })}
            />
            <Label htmlFor="confirm_accurate" className="text-sm leading-snug">
              I confirm the information supplied is accurate and the uploaded documents are
              authentic to the best of my knowledge. I understand that false or misleading
              information may affect my application. *
            </Label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm_terms"
              checked={confirmations.terms}
              onCheckedChange={(c) => setConfirmations({ terms: !!c })}
            />
            <Label htmlFor="confirm_terms" className="text-sm leading-snug">
              I agree to the relevant privacy and processing terms. *
            </Label>
          </div>
          {errors.confirmations && <p className="text-xs text-destructive">{errors.confirmations}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
