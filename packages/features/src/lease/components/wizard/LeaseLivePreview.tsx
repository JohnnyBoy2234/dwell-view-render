// @ts-nocheck
import React, { useMemo } from 'react';
import type { LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { processLeaseTemplate } from '../../utils/leaseTemplateEngine';
import { renderLeaseAsHtml, getLeaseStyles } from '../../utils/leaseHtmlRenderer';
import { MASTER_LEASE_TEMPLATE } from '../../templates/masterLeaseTemplate';
import { CONDITION_REPORT_TEMPLATE } from '../../templates/conditionReportTemplate';

/**
 * Live, formatted lease preview — the exact same template renderer used by the
 * review modal and PDF pipeline, so what the landlord sees forming here matches
 * the final document. On-screen only; the downloadable PDF still comes from
 * generate-lease-pdf.
 */
export function LeaseLivePreview({ data }: { data: LeaseWizardData }) {
  const { leaseHtml, conditionHtml } = useMemo(() => {
    try {
      return {
        leaseHtml: renderLeaseAsHtml(processLeaseTemplate(MASTER_LEASE_TEMPLATE, data)),
        conditionHtml: renderLeaseAsHtml(processLeaseTemplate(CONDITION_REPORT_TEMPLATE, data)),
      };
    } catch {
      return { leaseHtml: '', conditionHtml: '' };
    }
  }, [data]);

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white">
      <style>{getLeaseStyles()}</style>
      <div className="lease-document p-5 text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: leaseHtml }} />
      <div className="border-t border-slate-100 p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Annexure A — Condition Report</p>
        <div className="lease-document text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: conditionHtml }} />
      </div>
    </div>
  );
}
