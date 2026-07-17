import { useRef, useState } from 'react';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Camera, IdCard, Image, Loader2 } from 'lucide-react';
import { DOCUMENT_TYPES, SA_PROVINCES } from '@mzanzihomes/common/constants/applicationConstants';
import { deriveFromIdNumber, extractIdInfo, type ExtractedFieldKey } from '../../services/idExtraction';
import { fileProblem, uploadApplicationDocument } from '../../services/documentService';
import { normalizeAndAssess, QUALITY_MESSAGES } from '../../services/imagePipeline';
import { DocumentRow, Field, textInput, useRemoveDocument, type StepProps } from './shared';

const REVIEW_NOTICE = 'We could not read this clearly — please check it against your document.';

/** Step 2: identity, contact and current-address details, with an optional
 * ID scan that pre-fills what it can. Manual entry always stays available. */
export function YourDetailsStep({ data, update, errors, userId, onUploadComplete }: StepProps) {
  const { toast } = useToast();
  const p = data.personal;
  const i = data.identity;
  const a = data.address;
  const removeDocument = useRemoveDocument();
  const [scanning, setScanning] = useState(false);
  const [checkDetails, setCheckDetails] = useState(false);
  const [flagged, setFlagged] = useState<Set<ExtractedFieldKey>>(new Set());
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);

  const unflag = (field: ExtractedFieldKey) =>
    setFlagged((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });

  const setP = (field: keyof typeof p) => (v: string) => {
    if (field === 'first_name' || field === 'middle_name' || field === 'last_name') unflag(field);
    update('personal', { [field]: v });
  };
  const setA = (field: keyof typeof a) => (v: string) => update('address', { [field]: v });

  const onIdNumberChange = (value: string) => {
    unflag('id_number');
    const patch: Partial<typeof i> = { id_number: value };
    if (i.id_type === 'sa_id') {
      const derived = deriveFromIdNumber(value);
      if (derived?.date_of_birth) patch.date_of_birth = derived.date_of_birth;
    }
    update('identity', patch);
  };

  const handleScan = async (file: File | undefined) => {
    if (!file) return;
    const problem = fileProblem(file, DOCUMENT_TYPES.ID_DOCUMENT);
    if (problem) {
      toast({ title: 'Could not use this file', description: problem, variant: 'destructive' });
      return;
    }
    setScanning(true);
    try {
      const doc = await uploadApplicationDocument(file, DOCUMENT_TYPES.ID_DOCUMENT, userId);
      update('identity', { document: doc });
      onUploadComplete();

      // Normalize (EXIF rotation + downscale) and check quality before spending
      // time on OCR — a bad photo either produces nothing or, worse, noise that
      // happens to look valid. Fall back to the original file if normalization
      // isn't supported (older browsers).
      const normalized = await normalizeAndAssess(file);
      if (normalized && normalized.verdict !== 'ok') {
        toast({ title: 'Could not read this photo', description: QUALITY_MESSAGES[normalized.verdict], variant: 'destructive' });
        return;
      }
      const ocrInput: File | Blob = normalized?.blob ?? file;

      // Autofill is best-effort — everything extracted stays editable below,
      // and extraction is never treated as identity verification.
      const result = await extractIdInfo(ocrInput);
      if (result) {
        const { info: extracted, lowConfidence } = result;
        const patch: Partial<typeof i> = {};
        if (extracted.id_number) patch.id_number = extracted.id_number;
        if (extracted.date_of_birth) patch.date_of_birth = extracted.date_of_birth;
        if (extracted.nationality) patch.nationality = extracted.nationality;
        if (extracted.id_expiry_date) patch.id_expiry_date = extracted.id_expiry_date;
        if (extracted.document_type === 'passport') patch.id_type = 'passport';
        update('identity', patch);
        const names: Record<string, string> = {};
        if (extracted.first_name) names.first_name = extracted.first_name;
        if (extracted.middle_name) names.middle_name = extracted.middle_name;
        if (extracted.last_name) names.last_name = extracted.last_name;
        if (Object.keys(names).length > 0) update('personal', names);
        setFlagged(new Set(lowConfidence));
        setCheckDetails(true);
      } else {
        toast({
          title: 'Document saved',
          description: 'We could not read the details automatically — please fill them in below.'
        });
      }
      fieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('ID scan upload failed', error);
      toast({
        title: 'Upload failed',
        description: 'Please check your connection and try again, or enter your details manually.',
        variant: 'destructive'
      });
    } finally {
      setScanning(false);
      if (cameraInput.current) cameraInput.current.value = '';
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Your details</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Who you are and how the landlord can reach you.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <IdCard className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <p className="font-medium">Scan your ID</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Use your camera or upload an image to fill in your details faster.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={scanning} onClick={() => cameraInput.current?.click()}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
              Take photo
            </Button>
            <Button type="button" variant="outline" disabled={scanning} onClick={() => fileInput.current?.click()}>
              <Image className="h-4 w-4 mr-2" />
              Choose from device
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => fieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Enter manually
            </Button>
          </div>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleScan(e.target.files?.[0])}
          />
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => handleScan(e.target.files?.[0])}
          />
          {i.document && (
            <DocumentRow
              doc={i.document}
              onRemove={() => removeDocument(i.document!, () => update('identity', { document: null }))}
            />
          )}
          <p className="text-xs text-muted-foreground">
            We use this document to complete and verify the information in your rental application.
            Your information is handled according to our{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {checkDetails && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <p className="font-medium">Check your details</p>
            <p className="text-sm text-muted-foreground mt-1">
              We filled in what we could read. Make sure everything below matches your identity
              document — anything marked in amber wasn't clear and needs a closer look.
            </p>
          </CardContent>
        </Card>
      )}

      <div ref={fieldsRef} className="space-y-4 scroll-mt-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="first_name"
            label="First name"
            required
            error={errors.first_name}
            notice={flagged.has('first_name') ? REVIEW_NOTICE : undefined}
          >
            {textInput('first_name', p.first_name, setP('first_name'), { autoComplete: 'given-name', placeholder: 'e.g. Thabo' })}
          </Field>
          <Field
            id="last_name"
            label="Surname"
            required
            error={errors.last_name}
            notice={flagged.has('last_name') ? REVIEW_NOTICE : undefined}
          >
            {textInput('last_name', p.last_name, setP('last_name'), { autoComplete: 'family-name', placeholder: 'e.g. Nkosi' })}
          </Field>
        </div>
        <Field
          id="middle_name"
          label="Middle name (optional)"
          notice={flagged.has('middle_name') ? REVIEW_NOTICE : undefined}
        >
          {textInput('middle_name', p.middle_name, setP('middle_name'), { placeholder: 'e.g. Kwame' })}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="id_type" label="Identity document" required>
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
            label={i.id_type === 'passport' ? 'Passport number' : 'ID number'}
            required
            error={errors.id_number}
            notice={flagged.has('id_number') ? REVIEW_NOTICE : undefined}
          >
            {textInput('id_number', i.id_number, onIdNumberChange, {
              inputMode: i.id_type === 'sa_id' ? 'numeric' : 'text',
              placeholder: i.id_type === 'sa_id' ? 'e.g. 9001015800086' : 'e.g. A1234567'
            })}
          </Field>
          <Field
            id="date_of_birth"
            label="Date of birth"
            required
            error={errors.date_of_birth}
            notice={flagged.has('date_of_birth') ? REVIEW_NOTICE : undefined}
          >
            <Input
              id="date_of_birth"
              type="date"
              value={i.date_of_birth}
              onChange={(e) => {
                unflag('date_of_birth');
                update('identity', { date_of_birth: e.target.value });
              }}
            />
          </Field>
          <Field
            id="nationality"
            label="Citizenship"
            required
            error={errors.nationality}
            notice={flagged.has('nationality') ? REVIEW_NOTICE : undefined}
          >
            {textInput('nationality', i.nationality, (v) => {
              unflag('nationality');
              update('identity', { nationality: v });
            }, { placeholder: 'e.g. South African' })}
          </Field>
        </div>

        {i.id_type === 'passport' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              id="id_expiry_date"
              label="Passport expiry date"
              required
              error={errors.id_expiry_date}
              notice={flagged.has('id_expiry_date') ? REVIEW_NOTICE : undefined}
            >
              <Input
                id="id_expiry_date"
                type="date"
                value={i.id_expiry_date}
                onChange={(e) => {
                  unflag('id_expiry_date');
                  update('identity', { id_expiry_date: e.target.value });
                }}
              />
            </Field>
            <Field id="permit_type" label="Permit type (if applicable)">
              {textInput('permit_type', i.permit_type, (v) => update('identity', { permit_type: v }), {
                placeholder: 'e.g. work permit, study visa'
              })}
            </Field>
            {i.permit_type && (
              <Field id="permit_expiry_date" label="Permit expiry date" required error={errors.permit_expiry_date}>
                <Input
                  id="permit_expiry_date"
                  type="date"
                  value={i.permit_expiry_date}
                  onChange={(e) => update('identity', { permit_expiry_date: e.target.value })}
                />
              </Field>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="phone" label="Mobile number" required error={errors.phone}>
            {textInput('phone', p.phone, setP('phone'), { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: 'e.g. 082 123 4567' })}
          </Field>
          <Field id="email" label="Email address" required error={errors.email}>
            {textInput('email', p.email, setP('email'), { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'e.g. name@example.com' })}
          </Field>
        </div>

        <h4 className="text-sm font-semibold pt-2">Current residential address</h4>
        <Field id="line1" label="Street address" required error={errors.line1}>
          {textInput('line1', a.line1, setA('line1'), { autoComplete: 'address-line1', placeholder: 'e.g. 12 Protea Road' })}
        </Field>
        <Field id="line2" label="Unit / complex (optional)">
          {textInput('line2', a.line2, setA('line2'), { autoComplete: 'address-line2', placeholder: 'e.g. Unit 4, Protea Court' })}
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="suburb" label="Suburb" required error={errors.suburb}>
            {textInput('suburb', a.suburb, setA('suburb'), { placeholder: 'e.g. Sandton' })}
          </Field>
          <Field id="city" label="City or town" required error={errors.city}>
            {textInput('city', a.city, setA('city'), { autoComplete: 'address-level2', placeholder: 'e.g. Johannesburg' })}
          </Field>
          <Field id="province" label="Province" required error={errors.province}>
            <Select value={a.province} onValueChange={setA('province')}>
              <SelectTrigger id="province">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {SA_PROVINCES.map((prov) => (
                  <SelectItem key={prov} value={prov}>
                    {prov}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="postal_code" label="Postal code" required error={errors.postal_code}>
            {textInput('postal_code', a.postal_code, setA('postal_code'), { inputMode: 'numeric', autoComplete: 'postal-code', placeholder: 'e.g. 2196' })}
          </Field>
          <Field id="country" label="Country" required error={errors.country}>
            {textInput('country', a.country, setA('country'), { autoComplete: 'country-name', placeholder: 'e.g. South Africa' })}
          </Field>
          <Field id="years_at_address" label="How long have you lived here?" required error={errors.years_at_address}>
            {textInput('years_at_address', a.years_at_address, setA('years_at_address'), {
              placeholder: 'e.g. 2 years 6 months'
            })}
          </Field>
        </div>
      </div>
    </div>
  );
}
