import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Input } from '@mzanzihomes/ui/components/input';
import { deriveFromIdNumber, extractIdInfo } from '../../services/idExtraction';
import { DocumentRow, DocumentUpload, Field, textInput, useRemoveDocument, type StepProps } from './shared';
import { DOCUMENT_TYPES } from '@mzanzihomes/common/constants/applicationConstants';

export function IdentityStep({ data, update, errors, userId, onUploadComplete }: StepProps) {
  const i = data.identity;
  const removeDocument = useRemoveDocument();

  const onIdNumberChange = (value: string) => {
    const patch: Partial<typeof i> = { id_number: value };
    if (i.id_type === 'sa_id') {
      const derived = deriveFromIdNumber(value);
      if (derived?.date_of_birth) patch.date_of_birth = derived.date_of_birth;
    }
    update('identity', patch);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Identity Verification</h3>
      <p className="text-sm text-muted-foreground">
        Your ID helps verify your identity and can be used to automatically complete parts of your
        rental application.
      </p>

      <div className="space-y-3">
        <DocumentUpload
          documentType={DOCUMENT_TYPES.ID_DOCUMENT}
          userId={userId}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          label={i.document ? 'Replace ID document' : 'Upload ID document'}
          helperText="PDF, JPG, PNG or WebP, max 10 MB."
          camera
          onUploaded={async (doc, file) => {
            update('identity', { document: doc });
            // Autofill is best-effort; the fields below stay editable either way
            const extracted = await extractIdInfo(file);
            if (extracted) {
              const patch: Record<string, string> = {};
              if (extracted.id_number) patch.id_number = extracted.id_number;
              if (extracted.date_of_birth) patch.date_of_birth = extracted.date_of_birth;
              if (extracted.nationality) patch.nationality = extracted.nationality;
              update('identity', patch);
            }
          }}
          onUploadComplete={onUploadComplete}
        />
        {i.document && (
          <DocumentRow
            doc={i.document}
            onRemove={() => removeDocument(i.document!, () => update('identity', { document: null }))}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Automatic extraction isn't available yet — please check and complete your details below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="id_type" label="Document Type" required>
          <Select value={i.id_type} onValueChange={(v) => update('identity', { id_type: v as 'sa_id' | 'passport' })}>
            <SelectTrigger id="id_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sa_id">South African ID</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          id="id_number"
          label={i.id_type === 'passport' ? 'Passport Number' : 'ID Number'}
          required
          error={errors.id_number}
        >
          {textInput('id_number', i.id_number, onIdNumberChange, { inputMode: i.id_type === 'sa_id' ? 'numeric' : 'text' })}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="date_of_birth" label="Date of Birth" required error={errors.date_of_birth}>
          <Input
            id="date_of_birth"
            type="date"
            value={i.date_of_birth}
            onChange={(e) => update('identity', { date_of_birth: e.target.value })}
          />
        </Field>
        <Field id="nationality" label="Nationality" required error={errors.nationality}>
          {textInput('nationality', i.nationality, (v) => update('identity', { nationality: v }))}
        </Field>
      </div>

      {i.id_type === 'passport' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="id_expiry_date" label="Passport Expiry Date" required error={errors.id_expiry_date}>
            <Input
              id="id_expiry_date"
              type="date"
              value={i.id_expiry_date}
              onChange={(e) => update('identity', { id_expiry_date: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
