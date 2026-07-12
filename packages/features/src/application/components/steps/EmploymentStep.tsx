import { Input } from '@mzanzihomes/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import {
  DOCUMENT_TYPES,
  EMPLOYED_STATUSES,
  EMPLOYMENT_STATUS_OPTIONS
} from '@mzanzihomes/common/constants/applicationConstants';
import { DocumentRow, DocumentUpload, Field, FieldError, textInput, useRemoveDocument, type StepProps } from './shared';

export function EmploymentStep({ data, update, errors, userId, onUploadComplete }: StepProps) {
  const e = data.employment;
  const set = (field: keyof typeof e) => (v: string) => update('employment', { [field]: v });
  const removeDocument = useRemoveDocument();

  const isEmployed = (EMPLOYED_STATUSES as readonly string[]).includes(e.status);
  const isSelfEmployed = e.status === 'self-employed';
  const isStudent = e.status === 'student';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Employment and Income</h3>

      <Field id="employment_status" label="Employment Status" required error={errors.status}>
        <Select value={e.status} onValueChange={set('status')}>
          <SelectTrigger id="employment_status">
            <SelectValue placeholder="Select employment status" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isEmployed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="employer_name" label="Employer Name" required error={errors.employer_name}>
            {textInput('employer_name', e.employer_name, set('employer_name'))}
          </Field>
          <Field id="job_title" label="Job Title" required error={errors.job_title}>
            {textInput('job_title', e.job_title, set('job_title'))}
          </Field>
          <Field id="start_date" label="Employment Start Date">
            <Input id="start_date" type="date" value={e.start_date} onChange={(ev) => set('start_date')(ev.target.value)} />
          </Field>
          <Field id="employer_contact" label="Employer Contact Details">
            {textInput('employer_contact', e.employer_contact, set('employer_contact'), { placeholder: 'Phone or email' })}
          </Field>
          <Field id="gross_monthly_income" label="Monthly Gross Income (R)" error={errors.gross_monthly_income}>
            {textInput('gross_monthly_income', e.gross_monthly_income, (v) => set('gross_monthly_income')(v.replace(/,/g, '')), { inputMode: 'decimal' })}
          </Field>
          <Field id="net_monthly_income" label="Monthly Net Income (R)" required error={errors.net_monthly_income}>
            {textInput('net_monthly_income', e.net_monthly_income, (v) => set('net_monthly_income')(v.replace(/,/g, '')), { inputMode: 'decimal' })}
          </Field>
        </div>
      )}

      {isSelfEmployed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="business_name" label="Business or Trading Name" required error={errors.business_name}>
            {textInput('business_name', e.business_name, set('business_name'))}
          </Field>
          <Field id="industry" label="Industry">
            {textInput('industry', e.industry, set('industry'))}
          </Field>
          <Field id="years_self_employed" label="Time Self-Employed">
            {textInput('years_self_employed', e.years_self_employed, set('years_self_employed'), { placeholder: 'e.g. 3 years' })}
          </Field>
          <Field id="business_reg_number" label="Business Registration Number">
            {textInput('business_reg_number', e.business_reg_number, set('business_reg_number'))}
          </Field>
          <Field id="net_monthly_income" label="Average Monthly Income (R)" required error={errors.net_monthly_income}>
            {textInput('net_monthly_income', e.net_monthly_income, (v) => set('net_monthly_income')(v.replace(/,/g, '')), { inputMode: 'decimal' })}
          </Field>
        </div>
      )}

      {isStudent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="institution" label="Institution Name" required error={errors.institution}>
            {textInput('institution', e.institution, set('institution'))}
          </Field>
          <Field id="course" label="Course or Qualification">
            {textInput('course', e.course, set('course'))}
          </Field>
          <Field id="sponsor_details" label="Sponsor / Guardian / Responsible Payer">
            {textInput('sponsor_details', e.sponsor_details, set('sponsor_details'))}
          </Field>
          <Field id="payment_source" label="Source of Rental Payment" required error={errors.payment_source}>
            {textInput('payment_source', e.payment_source, set('payment_source'), { placeholder: 'e.g. bursary, parents' })}
          </Field>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-medium">Proof of Income</h4>
        <p className="text-xs text-muted-foreground">
          Recent payslips, three months of bank statements, or other income-supporting documents.
          Proof of income helps the landlord assess whether the monthly rental is affordable based
          on the information supplied. PDF, DOC, JPG or PNG, max 10 MB each.
        </p>
        <DocumentUpload
          documentType={DOCUMENT_TYPES.INCOME}
          userId={userId}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          label="Upload income document"
          onUploaded={(doc) => update('employment', { income_documents: [...e.income_documents, doc] })}
          onUploadComplete={onUploadComplete}
        />
        {e.income_documents.map((doc) => (
          <DocumentRow
            key={doc.path}
            doc={doc}
            onRemove={() =>
              removeDocument(doc, () =>
                update('employment', { income_documents: e.income_documents.filter((d) => d.path !== doc.path) })
              )
            }
          />
        ))}
        <FieldError error={errors.income_documents} />
      </div>
    </div>
  );
}
