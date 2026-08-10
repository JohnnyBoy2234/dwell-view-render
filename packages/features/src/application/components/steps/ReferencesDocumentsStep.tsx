import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { ExternalLink } from 'lucide-react';
import { DOCUMENT_TYPES, EXPERIAN_URL } from '@mzanzihomes/common/constants/applicationConstants';
import { creditReportOutdated, documentChecklist, type ChecklistItem } from '../../checklist';
import type { DocRef } from '../../types';
import { DocumentRow, DocumentUpload, Field, FieldError, textInput, useRemoveDocument, YesNoQuestion, type StepProps } from './shared';

const REQUIREMENT_BADGE: Record<ChecklistItem['requirement'], { label: string; className: string }> = {
  required: { label: 'Required', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  recommended: { label: 'Recommended', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  optional: { label: 'Optional', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' }
};

/** Step 5: every reference and upload in one smart step. The checklist is
 * generated from the applicant's earlier answers. */
export function ReferencesDocumentsStep({ data, update, errors, userId, onUploadComplete }: StepProps) {
  const r = data.references;
  const removeDocument = useRemoveDocument();
  const items = documentChecklist(data);

  const addIncomeDoc = (doc: DocRef) =>
    update('employment', { income_documents: [...data.employment.income_documents, doc] });

  const removeIncomeDoc = (doc: DocRef) =>
    removeDocument(doc, () =>
      update('employment', {
        income_documents: data.employment.income_documents.filter((d) => d.path !== doc.path)
      })
    );

  const itemHandlers: Record<string, { onUploaded: (doc: DocRef) => void; onRemove: (doc: DocRef) => void }> = {
    id: {
      onUploaded: (doc) => update('identity', { document: doc }),
      onRemove: (doc) => removeDocument(doc, () => update('identity', { document: null }))
    },
    proof_of_address: {
      onUploaded: (doc) => update('address', { proof_document: doc }),
      onRemove: (doc) => removeDocument(doc, () => update('address', { proof_document: null }))
    },
    bank_statements: { onUploaded: addIncomeDoc, onRemove: removeIncomeDoc },
    payslips: { onUploaded: addIncomeDoc, onRemove: removeIncomeDoc },
    income_evidence: { onUploaded: addIncomeDoc, onRemove: removeIncomeDoc },
    credit_report: {
      onUploaded: (doc) => update('credit', { report_documents: [doc] }),
      onRemove: (doc) =>
        removeDocument(doc, () =>
          update('credit', {
            report_documents: data.credit.report_documents.filter((d) => d.path !== doc.path)
          })
        )
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">References and documents</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Based on your answers, this is everything the landlord needs. Photos from your camera are
          fine. All documents are stored privately.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Previous rental reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <YesNoQuestion
            id="rented_before"
            label="Have you rented before?"
            value={r.rented_before}
            onChange={(v) => update('references', { rented_before: v })}
            error={errors.rented_before}
          />
          {r.rented_before === 'yes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="landlord_name" label="Previous landlord or agent name" required error={errors.landlord_name}>
                {textInput('landlord_name', r.landlord_name, (v) => update('references', { landlord_name: v }), { placeholder: 'e.g. Jane Smith' })}
              </Field>
              <Field id="landlord_phone" label="Their mobile number" error={errors.landlord_phone}>
                {textInput('landlord_phone', r.landlord_phone, (v) => update('references', { landlord_phone: v }), { type: 'tel', inputMode: 'tel', placeholder: 'e.g. 082 123 4567' })}
              </Field>
              <Field id="landlord_email" label="Their email address (optional)">
                {textInput('landlord_email', r.landlord_email, (v) => update('references', { landlord_email: v }), { type: 'email', inputMode: 'email', placeholder: 'e.g. name@example.com' })}
              </Field>
              <Field id="previous_address" label="The rental address (optional)">
                {textInput('previous_address', r.previous_address, (v) => update('references', { previous_address: v }), { placeholder: 'e.g. 45 Oak Street, Rosebank' })}
              </Field>
              <div className="sm:col-span-2 flex items-start space-x-2">
                <Checkbox
                  id="may_contact"
                  checked={r.may_contact}
                  onCheckedChange={(c) => update('references', { may_contact: !!c })}
                />
                <Label htmlFor="may_contact" className="text-sm leading-snug">
                  The landlord may contact this reference about my rental history.
                </Label>
              </div>
            </div>
          )}
          {r.rented_before === 'no' && (
            <p className="text-sm text-muted-foreground">
              No problem — you don&rsquo;t need a rental history to apply.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employment or income reference (optional)</CardTitle>
          <p className="text-sm text-muted-foreground">
            An employer, accountant, bookkeeper or regular client who can confirm your income.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="income_ref_name" label="Name">
              {textInput('income_ref_name', r.income_ref_name, (v) => update('references', { income_ref_name: v }), { placeholder: 'e.g. Jane Smith' })}
            </Field>
            <Field id="income_ref_role" label="Their role">
              {textInput('income_ref_role', r.income_ref_role, (v) => update('references', { income_ref_role: v }), { placeholder: 'e.g. employer, accountant' })}
            </Field>
            <Field id="income_ref_contact" label="Contact details">
              {textInput('income_ref_contact', r.income_ref_contact, (v) => update('references', { income_ref_contact: v }), { placeholder: 'Phone or email' })}
            </Field>
          </div>
        </CardContent>
      </Card>

      <div>
        <h4 className="text-base font-semibold">Your document checklist</h4>
        <p className="text-sm text-muted-foreground mt-1">
          PDF or photos, max 10 MB each. You can replace or remove anything before you submit.
        </p>
      </div>

      {items.map((item) => {
        const badge = REQUIREMENT_BADGE[item.requirement];
        const uploaded = item.docs.length > 0;
        const handlers = itemHandlers[item.key];
        const isCreditReport = item.key === 'credit_report';
        return (
          <Card key={item.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{item.label}</CardTitle>
                <div className="flex gap-2 shrink-0">
                  <Badge className={badge.className}>{badge.label}</Badge>
                  <Badge
                    className={
                      uploaded
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                    }
                  >
                    {uploaded ? 'Uploaded' : 'Missing'}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{item.helper}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {isCreditReport && (
                <>
                  <p className="text-sm text-muted-foreground">
                    You can get your credit report free from Experian, then upload it here.
                  </p>
                  <Button asChild variant="outline" size="sm" className="max-w-full">
                    <a href={EXPERIAN_URL} target="_blank" rel="noopener noreferrer">
                      <span className="truncate">Get free Experian report</span>
                      <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
                    </a>
                  </Button>
                </>
              )}
              <DocumentUpload
                documentType={item.documentType}
                userId={userId}
                accept={item.documentType === DOCUMENT_TYPES.ID_DOCUMENT ? '.pdf,.jpg,.jpeg,.png,.webp' : '.pdf,.jpg,.jpeg,.png'}
                label={uploaded && (item.key === 'id' || isCreditReport) ? 'Replace file' : 'Upload file'}
                camera
                onUploaded={handlers.onUploaded}
                onUploadComplete={onUploadComplete}
              />
              {item.docs.map((doc) => (
                <DocumentRow key={doc.path} doc={doc} onRemove={() => handlers.onRemove(doc)} />
              ))}
              {isCreditReport && uploaded && (
                <div className="max-w-xs">
                  <Field id="report_date" label="Date on the credit report">
                    <Input
                      id="report_date"
                      type="date"
                      value={data.credit.report_date}
                      onChange={(e) => update('credit', { report_date: e.target.value })}
                    />
                  </Field>
                  {creditReportOutdated(data.credit.report_date) && (
                    <p className="text-xs text-amber-700 mt-1">
                      This report looks older than three months — the landlord may ask for a newer one.
                    </p>
                  )}
                </div>
              )}
              <FieldError error={errors[`doc_${item.key}`]} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
