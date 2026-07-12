import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Label } from '@mzanzihomes/ui/components/label';
import { ExternalLink } from 'lucide-react';
import {
  CREDIT_CONSENT_TEXT,
  DOCUMENT_TYPES,
  EXPERIAN_URL
} from '@mzanzihomes/common/constants/applicationConstants';
import { DocumentRow, DocumentUpload, FieldError, useRemoveDocument, type StepProps } from './shared';

export function CreditStep({ data, update, errors, userId, onUploadComplete }: StepProps) {
  const c = data.credit;
  const removeDocument = useRemoveDocument();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Credit Report and Consent</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your credit report helps the landlord understand your credit history and assess your
          rental application. You can obtain your free credit report from Experian and upload it
          here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experian Credit Report (Free)</CardTitle>
          <ol className="list-decimal list-inside space-y-1 mt-1 text-sm text-muted-foreground">
            <li>Open the Experian website.</li>
            <li>Register or sign in.</li>
            <li>Complete the required identity checks.</li>
            <li>Download your latest credit report.</li>
            <li>Return to this application and upload the report.</li>
          </ol>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <a href={EXPERIAN_URL} target="_blank" rel="noopener noreferrer">
              Get your free Experian credit report
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>

          <DocumentUpload
            documentType={DOCUMENT_TYPES.EXPERIAN_CREDIT_REPORT}
            userId={userId}
            accept=".pdf,.jpg,.jpeg,.png"
            label={c.report_documents.length > 0 ? 'Replace credit report' : 'Upload credit report'}
            helperText="PDF, JPG or PNG, max 10 MB."
            onUploaded={(doc) => update('credit', { report_documents: [doc] })}
            onUploadComplete={onUploadComplete}
          />
          {c.report_documents.map((doc) => (
            <DocumentRow
              key={doc.path}
              doc={doc}
              onRemove={() =>
                removeDocument(doc, () =>
                  update('credit', { report_documents: c.report_documents.filter((d) => d.path !== doc.path) })
                )
              }
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credit-Check Consent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="credit_consent"
              checked={c.consent}
              onCheckedChange={(checked) => update('credit', { consent: !!checked })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="credit_consent" className="text-sm font-medium leading-snug">
                {CREDIT_CONSENT_TEXT} *
              </Label>
              <p className="text-xs text-muted-foreground">
                Read our{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener" className="underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/terms" target="_blank" rel="noopener" className="underline">
                  Terms and Conditions
                </a>
                .
              </p>
            </div>
          </div>
          <FieldError error={errors.consent} />
        </CardContent>
      </Card>
    </div>
  );
}
