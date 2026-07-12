import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import {
  DOCUMENT_TYPES,
  RESIDENTIAL_STATUS_OPTIONS,
  SA_PROVINCES
} from '@mzanzihomes/common/constants/applicationConstants';
import { DocumentRow, DocumentUpload, Field, textInput, useRemoveDocument, type StepProps } from './shared';

export function AddressStep({ data, update, errors, userId, onUploadComplete }: StepProps) {
  const a = data.address;
  const set = (field: keyof typeof a) => (v: string) => update('address', { [field]: v });
  const removeDocument = useRemoveDocument();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Residential Address</h3>

      <Field id="line1" label="Address Line 1" required error={errors.line1}>
        {textInput('line1', a.line1, set('line1'), { autoComplete: 'address-line1' })}
      </Field>
      <Field id="line2" label="Address Line 2">
        {textInput('line2', a.line2, set('line2'), { autoComplete: 'address-line2' })}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="suburb" label="Suburb" required error={errors.suburb}>
          {textInput('suburb', a.suburb, set('suburb'))}
        </Field>
        <Field id="city" label="City or Town" required error={errors.city}>
          {textInput('city', a.city, set('city'), { autoComplete: 'address-level2' })}
        </Field>
        <Field id="province" label="Province" required error={errors.province}>
          <Select value={a.province} onValueChange={set('province')}>
            <SelectTrigger id="province">
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {SA_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="postal_code" label="Postal Code" required error={errors.postal_code}>
          {textInput('postal_code', a.postal_code, set('postal_code'), { inputMode: 'numeric', autoComplete: 'postal-code' })}
        </Field>
        <Field id="country" label="Country" required error={errors.country}>
          {textInput('country', a.country, set('country'), { autoComplete: 'country-name' })}
        </Field>
        <Field id="years_at_address" label="How long have you lived here?" required error={errors.years_at_address}>
          {textInput('years_at_address', a.years_at_address, set('years_at_address'), { placeholder: 'e.g. 2 years 6 months' })}
        </Field>
      </div>

      <Field id="residential_status" label="Residential Status" required error={errors.residential_status}>
        <Select value={a.residential_status} onValueChange={set('residential_status')}>
          <SelectTrigger id="residential_status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {RESIDENTIAL_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="reason_for_moving" label="Reason for Moving">
        <Textarea
          id="reason_for_moving"
          value={a.reason_for_moving}
          onChange={(e) => set('reason_for_moving')(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="previous_landlord_name" label="Previous Landlord Name">
          {textInput('previous_landlord_name', a.previous_landlord_name, set('previous_landlord_name'))}
        </Field>
        <Field id="previous_landlord_contact" label="Previous Landlord Contact">
          {textInput('previous_landlord_contact', a.previous_landlord_contact, set('previous_landlord_contact'))}
        </Field>
      </div>

      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-medium">Proof of Address (optional)</h4>
        <p className="text-xs text-muted-foreground">
          A utility bill, bank statement, municipal account, lease agreement, or official
          correspondence showing your address. PDF, JPG, PNG or WebP, max 10 MB.
        </p>
        <DocumentUpload
          documentType={DOCUMENT_TYPES.PROOF_OF_ADDRESS}
          userId={userId}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          label={a.proof_document ? 'Replace proof of address' : 'Upload proof of address'}
          onUploaded={(doc) => update('address', { proof_document: doc })}
          onUploadComplete={onUploadComplete}
        />
        {a.proof_document && (
          <DocumentRow
            doc={a.proof_document}
            onRemove={() => removeDocument(a.proof_document!, () => update('address', { proof_document: null }))}
          />
        )}
      </div>
    </div>
  );
}
