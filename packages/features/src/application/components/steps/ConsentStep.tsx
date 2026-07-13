import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Label } from '@mzanzihomes/ui/components/label';
import { Info, ShieldCheck } from 'lucide-react';
import { CREDIT_CONSENT_TEXT } from '@mzanzihomes/common/constants/applicationConstants';
import { FieldError, type StepProps } from './shared';

const EXPLANATION_POINTS = [
  'The checks help the landlord assess whether the rental is affordable and suitable.',
  'The landlord and authorised screening providers may process the information you supplied.',
  'The checks may cover identity, affordability, credit, rental history and references.',
  'The landlord makes the final decision — MzansiHomes provides the software and does not decide.',
  'Your information is used only for lawful rental-screening purposes.'
];

/** Step 4: one dedicated, auditable consent decision. Ticking the box means
 * consent = yes; continuing without ticking records an explicit no — consent
 * is never assumed. */
export function ConsentStep({ data, update, errors }: StepProps) {
  const consented = data.credit.consent === 'yes';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Consent to screening checks</h3>
        <p className="text-sm text-muted-foreground mt-1">
          With your permission, the landlord and authorised screening providers may use the
          information in this application to assess identity, affordability, rental history,
          references and credit information for this rental application.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <p className="font-medium text-sm">What this means</p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {EXPLANATION_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            You can read more in our{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Card className={consented ? 'border-primary/40' : undefined}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="screening_consent"
              checked={consented}
              onCheckedChange={(checked) => update('credit', { consent: checked ? 'yes' : '' })}
            />
            <Label htmlFor="screening_consent" className="text-sm font-medium leading-snug">
              {CREDIT_CONSENT_TEXT}
            </Label>
          </div>
          <FieldError error={errors.consent} />
        </CardContent>
      </Card>

      {!consented && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            You may continue without giving consent, but the landlord may be unable to complete the
            assessment and may decline the application.
          </p>
        </div>
      )}
    </div>
  );
}
