import { DOCUMENT_TYPES, EMPLOYED_STATUSES } from '@mzanzihomes/common/constants/applicationConstants';
import type { ApplicationFormData, DocRef } from './types';

export type Requirement = 'required' | 'recommended' | 'optional';

export interface ChecklistItem {
  key: string;
  label: string;
  helper: string;
  documentType: string;
  requirement: Requirement;
  docs: DocRef[];
}

const incomeDocs = (data: ApplicationFormData, type: string): DocRef[] =>
  data.employment.income_documents.filter((d) => d.type === type);

/**
 * The smart document checklist for step 5, derived from the applicant's
 * earlier answers. Product decision, not legal advice: only 'required' items
 * block submission.
 */
export function documentChecklist(data: ApplicationFormData): ChecklistItem[] {
  const status = data.employment.status;
  const employed = (EMPLOYED_STATUSES as readonly string[]).includes(status);
  const selfEmployed = status === 'self-employed';
  const informal = status === 'informal';

  const items: ChecklistItem[] = [
    {
      key: 'id',
      label: 'Identity document or passport',
      helper: 'A clear photo or PDF of your ID or passport.',
      documentType: DOCUMENT_TYPES.ID_DOCUMENT,
      requirement: 'required',
      docs: data.identity.document ? [data.identity.document] : []
    },
    {
      key: 'proof_of_address',
      label: 'Proof of current address',
      helper: 'A utility bill, bank statement or municipal account showing your address.',
      documentType: DOCUMENT_TYPES.PROOF_OF_ADDRESS,
      requirement: 'recommended',
      docs: data.address.proof_document ? [data.address.proof_document] : []
    },
    {
      key: 'bank_statements',
      label: 'Bank statements',
      helper: 'Normally your most recent three months.',
      documentType: DOCUMENT_TYPES.BANK_STATEMENT,
      requirement: informal ? 'recommended' : 'required',
      docs: incomeDocs(data, DOCUMENT_TYPES.BANK_STATEMENT)
    }
  ];

  if (employed) {
    items.push({
      key: 'payslips',
      label: 'Recent payslips',
      helper: 'Your latest payslip, or an employment letter or contract.',
      documentType: DOCUMENT_TYPES.PAYSLIP,
      requirement: 'required',
      docs: incomeDocs(data, DOCUMENT_TYPES.PAYSLIP)
    });
  }

  if (selfEmployed || informal || status === 'other' || status === 'student') {
    items.push({
      key: 'income_evidence',
      label: selfEmployed ? 'Business income evidence' : 'Other income evidence',
      helper: selfEmployed
        ? 'Business bank statements, invoices, client contracts, management accounts, an accountant letter or tax documents.'
        : 'Anything that shows how the rent will be paid: invoices, payment records, a support letter, bursary or sponsor confirmation.',
      documentType: DOCUMENT_TYPES.INCOME,
      requirement: informal ? 'required' : 'recommended',
      docs: incomeDocs(data, DOCUMENT_TYPES.INCOME)
    });
  }

  items.push({
    key: 'credit_report',
    label: 'Credit report',
    helper: 'Upload your recent Experian credit report for the landlord to review.',
    documentType: DOCUMENT_TYPES.EXPERIAN_CREDIT_REPORT,
    requirement: 'recommended',
    docs: data.credit.report_documents
  });

  return items;
}

/** Required checklist items with nothing uploaded yet. */
export const missingRequiredDocuments = (data: ApplicationFormData): ChecklistItem[] =>
  documentChecklist(data).filter((i) => i.requirement === 'required' && i.docs.length === 0);

/** Roughly three months — after that the credit report is probably outdated. */
export const CREDIT_REPORT_MAX_AGE_DAYS = 92;

export function creditReportOutdated(reportDate: string): boolean {
  if (!reportDate) return false;
  const age = Date.now() - new Date(reportDate).getTime();
  return age > CREDIT_REPORT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}
