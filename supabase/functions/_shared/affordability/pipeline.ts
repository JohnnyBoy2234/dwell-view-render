// Affordability processing pipeline (server-side, self-hosted).
//
// uploaded → validating → virus_scanning → extracting_text → running_ocr →
// detecting_bank → extracting_transactions → categorising_transactions →
// validating_balances → calculating_affordability → generating_report →
// completed | requires_review | failed
//
// No fabricated results are ever produced: unsupported formats and
// unreliable/unreadable documents route to manual review. AI is not used here —
// the deterministic engine is the source of truth.
import { extractPdf } from "./extract.ts";
import { detectBank, findParser } from "./banks.ts";
import { analyse, type Rules } from "./analyse.ts";
import "./parsers/capitec.ts"; // self-registers the Capitec parser

const BUCKET = 'affordability-statements';

const DEFAULT_RULES: Rules = {
  required_months: 3,
  rent_to_income: { strong: 0.3, acceptable: 0.4, review: 0.5 },
  rent_to_disposable: { strong: 0.4, acceptable: 0.6, review: 0.8 },
  min_income_consistency: 0.6,
};

export async function runPipeline(supabase: any, assessmentId: string, jobId: string): Promise<void> {
  const setJob = (status: string, progress: number, extra: Record<string, unknown> = {}) =>
    supabase.from('affordability_processing_jobs').update({ status, progress, ...extra }).eq('id', jobId);
  const warn = (code: string, message: string, severity = 'warning', document_id: string | null = null) =>
    supabase.from('affordability_warnings').insert({ assessment_id: assessmentId, document_id, code, severity, message });
  const audit = (event: string, detail: unknown = null) =>
    supabase.rpc('affordability_audit', { p_assessment: assessmentId, p_event: event, p_role: 'system', p_detail: detail });

  try {
    const { data: assess } = await supabase
      .from('affordability_assessments').select('proposed_rent').eq('id', assessmentId).maybeSingle();
    const { data: docs } = await supabase
      .from('affordability_documents')
      .select('id, storage_path, status').eq('assessment_id', assessmentId).neq('status', 'deleted');

    if (!docs || docs.length === 0) {
      await setJob('failed', 100, { last_error: 'no_documents', finished_at: new Date().toISOString() });
      await supabase.from('affordability_assessments').update({ status: 'processing_failed' }).eq('id', assessmentId);
      return;
    }

    await setJob('validating', 10);
    await setJob('virus_scanning', 20); // hook — real ClamAV runs in the OCR/worker stage.

    await setJob('extracting_text', 35);
    const allPages: { page_number: number; text: string }[] = [];
    const pageOwner: Record<number, string> = {};
    let pageCounter = 0;
    let combinedText = '';
    let anyTextLayer = false;
    let imageOnlyPages = 0;
    let detectedBank: string | null = null;
    let firstDocId = docs[0].id as string;

    for (const d of docs) {
      const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(d.storage_path);
      if (dlErr || !file) { await warn('download_failed', 'A document could not be read for processing.', 'warning', d.id); continue; }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ex = await extractPdf(bytes);
      anyTextLayer = anyTextLayer || ex.hasTextLayer;
      imageOnlyPages += ex.imageOnlyPages;
      combinedText += '\n' + ex.fullText;
      if (!ex.readable) await warn('unreadable_pdf', 'A PDF could not be read — it may be corrupted or password-protected.', 'unable_to_verify', d.id);

      const pageRows: any[] = [];
      for (const p of ex.pages) {
        pageCounter += 1;
        allPages.push({ page_number: pageCounter, text: p.text });
        pageOwner[pageCounter] = d.id;
        pageRows.push({ assessment_id: assessmentId, document_id: d.id, page_number: pageCounter, has_text: p.has_text, ocr_used: false });
      }
      if (pageRows.length) await supabase.from('affordability_pages').insert(pageRows);

      const bank = detectBank(ex.fullText);
      if (bank && !detectedBank) detectedBank = bank;
      await supabase.from('affordability_documents').update({
        page_count: ex.pageCount, has_text_layer: ex.hasTextLayer, detected_bank: bank, status: 'processed',
      }).eq('id', d.id);
    }

    await setJob('running_ocr', 45);
    if (imageOnlyPages > 0) {
      await warn('ocr_unavailable', `${imageOnlyPages} page(s) appear to be scans without a text layer. OCR is not available yet — please upload the digital PDF from your banking app, or request manual review.`, 'unable_to_verify');
    }

    await setJob('detecting_bank', 55);
    if (!detectedBank) detectedBank = detectBank(combinedText);

    await setJob('extracting_transactions', 65);
    const parser = anyTextLayer ? findParser(combinedText) : null;

    if (!parser) {
      await warn(
        detectedBank ? 'unsupported_format' : 'bank_not_detected',
        detectedBank
          ? `Statements from ${detectedBank} are recognised, but automated extraction for this format isn't available yet. Please request manual review.`
          : 'This statement format is not currently supported. Please upload a statement from a supported bank or request manual review.',
        'unable_to_verify');
      await setJob('requires_review', 100, { finished_at: new Date().toISOString() });
      await supabase.from('affordability_assessments').update({ status: 'manual_review_required', confidence_status: 'unable_to_assess' }).eq('id', assessmentId);
      await audit('processing_requires_review', { detected_bank: detectedBank });
      return;
    }

    // Parse + run the deterministic engine.
    const parsed = parser.parse(allPages, combinedText);

    await setJob('categorising_transactions', 75);
    // Configurable rules.
    const { data: settingsRows } = await supabase.from('affordability_settings').select('key, value');
    const sMap = new Map((settingsRows ?? []).map((r: any) => [r.key, r.value]));
    const ruleVersion = (sMap.get('rule_version') as string) || 'v1';
    const rules = (sMap.get(`affordability_rules_${ruleVersion}`) as Rules) || DEFAULT_RULES;
    const retentionDays = Number(sMap.get('retention_days')) || 180;

    const result = analyse(parsed, assess?.proposed_rent ?? null, rules);

    await setJob('validating_balances', 85);
    // Persist transactions.
    if (result.transactions.length) {
      const rows = result.transactions.map((t) => ({
        assessment_id: assessmentId,
        document_id: pageOwner[t.source_page ?? 0] ?? firstDocId,
        txn_date: t.txn_date,
        value_date: t.value_date,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        balance_after: t.balance_after,
        category: t.category,
        subcategory: t.subcategory,
        is_recurring: t.is_recurring,
        is_own_account_transfer: t.is_own_account_transfer,
        is_excluded: t.is_excluded,
        exclusion_reason: t.exclusion_reason,
        confidence_score: t.confidence_score,
        classified_by: 'rules',
        source_page: t.source_page,
        raw_text: t.raw_text,
        validation_status: t.validation_status,
      }));
      await supabase.from('affordability_transactions').insert(rows);
    }

    await setJob('calculating_affordability', 90);
    // Link income/expense breakdowns to their supporting transactions (source tracing).
    const { data: inserted } = await supabase
      .from('affordability_transactions')
      .select('id, category, direction, is_recurring, is_excluded')
      .eq('assessment_id', assessmentId);
    const ins = inserted ?? [];

    if (result.incomeSources.length) {
      await supabase.from('affordability_income_sources').insert(result.incomeSources.map((s) => ({
        assessment_id: assessmentId, label: s.label, category: s.category,
        is_verified_recurring: s.is_verified_recurring, average_monthly_amount: s.average_monthly_amount,
        months_present: s.months_present,
        transaction_ids: ins.filter((r: any) => r.direction === 'credit' && !r.is_excluded && r.category === s.category && (!s.is_verified_recurring || r.is_recurring)).map((r: any) => r.id),
      })));
    }
    if (result.expenseCategories.length) {
      await supabase.from('affordability_expense_categories').insert(result.expenseCategories.map((c) => ({
        assessment_id: assessmentId, category: c.category, average_monthly_amount: c.average_monthly_amount,
        is_recurring: c.is_recurring,
        transaction_ids: ins.filter((r: any) => r.direction === 'debit' && !r.is_excluded && r.category === c.category).map((r: any) => r.id),
      })));
    }
    if (result.warnings.length) {
      await supabase.from('affordability_warnings').insert(result.warnings.map((w) => ({
        assessment_id: assessmentId, code: w.code, severity: w.severity, message: w.message,
      })));
    }
    if (result.reasonCodes.length) {
      await supabase.from('affordability_reason_codes').insert(result.reasonCodes.map((r) => ({
        assessment_id: assessmentId, code: r.code, message: r.message, polarity: r.polarity, metrics: null,
      })));
    }

    await setJob('generating_report', 95);
    const unable = result.confidence === 'unable_to_assess';
    await supabase.from('affordability_assessments').update({
      status: unable ? 'manual_review_required' : 'assessment_ready',
      confidence_status: result.confidence,
      recommendation: result.recommendation,
      rule_version: ruleVersion,
      statement_period_start: result.period_start,
      statement_period_end: result.period_end,
      input_metrics: {
        proposed_rent: assess?.proposed_rent ?? null,
        opening_balance: parsed.opening_balance,
        closing_balance: parsed.closing_balance,
        rules,
      },
      output_metrics: result.metrics,
      expires_at: new Date(Date.now() + retentionDays * 86400000).toISOString(),
    }).eq('id', assessmentId);

    await setJob(unable ? 'requires_review' : 'completed', 100, { finished_at: new Date().toISOString() });
    await audit(unable ? 'processing_requires_review' : 'assessment_ready', {
      recommendation: result.recommendation, confidence: result.confidence,
    });
  } catch (e) {
    await setJob('failed', 100, { last_error: String((e as Error)?.message || 'error').slice(0, 500), finished_at: new Date().toISOString() });
    await supabase.from('affordability_assessments').update({ status: 'processing_failed' }).eq('id', assessmentId);
    await audit('processing_failed');
  }
}
