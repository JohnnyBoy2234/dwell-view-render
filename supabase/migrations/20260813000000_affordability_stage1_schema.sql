-- ============================================================================
-- Affordability assessment — Stage 1: schema, RLS, config, storage.
--
-- Self-hosted bank-statement affordability analysis. DECISION-SUPPORT ONLY:
-- the system never auto-approves or auto-rejects a tenant; the landlord decides.
-- Additive only — no existing table is modified.
--
-- ⚠️ LEGAL: the consent wording, retention period, automated-decision handling
-- and rental-screening rules seeded/here must be reviewed by a South African
-- privacy (POPIA) professional before production release. See
-- docs/affordability/README.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Configuration: rules, consent version/text, retention, upload limits.
-- Thresholds live here (not in code) so they can change without a redeploy.
-- These are NOT hard auto-approve thresholds — they only drive reason codes.
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.affordability_settings enable row level security;
drop policy if exists affordability_settings_read on public.affordability_settings;
create policy affordability_settings_read on public.affordability_settings
  for select using (auth.uid() is not null);

insert into public.affordability_settings(key, value, description) values
  ('active_consent_version', '"v1"'::jsonb, 'Consent wording version currently in force'),
  ('consent_text_v1', to_jsonb('By submitting your bank statements, you consent to their secure processing for the purpose of assessing your ability to afford the proposed rent for this rental application. The information will be used to identify income, expenses, recurring commitments, and account activity relevant to the affordability assessment. Your information will only be shared with authorised parties involved in this application and will be retained according to our privacy policy. You may request access to or correction of your information.'::text), 'Tenant consent wording (v1)'),
  ('retention_days', '180'::jsonb, 'Days to retain statements + derived data before scheduled deletion'),
  ('rule_version', '"v1"'::jsonb, 'Affordability calculation rule-set version'),
  ('affordability_rules_v1',
    '{"required_months":3,"rent_to_income":{"strong":0.30,"acceptable":0.40,"review":0.50},"rent_to_disposable":{"strong":0.40,"acceptable":0.60,"review":0.80},"min_income_consistency":0.6}'::jsonb,
    'Configurable bands used to generate reason codes; NOT a universal approval threshold'),
  ('upload_limits',
    '{"max_file_bytes":15728640,"max_files":6,"allowed_mime":["application/pdf"],"required_months":3}'::jsonb,
    'Upload constraints for bank statements')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Core assessment (one per rental application).
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_assessments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  landlord_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  proposed_rent numeric(12,2),
  status text not null default 'waiting_for_tenant'
    check (status in ('not_requested','waiting_for_tenant','consent_granted','documents_uploaded',
      'processing','assessment_ready','processing_failed','manual_review_required',
      'correction_requested','expired','deleted')),
  confidence_status text
    check (confidence_status in ('high','medium','low','unable_to_assess')),
  provider_status text not null default 'self_hosted' check (provider_status = 'self_hosted'),
  rule_version text,
  statement_period_start date,
  statement_period_end date,
  recommendation text
    check (recommendation in ('strong','acceptable','further_review','insufficient')),
  input_metrics jsonb,   -- raw inputs used by the calc engine (traceable)
  output_metrics jsonb,  -- computed metrics (traceable)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  deleted_at timestamptz,
  unique(application_id)
);
create index if not exists idx_afford_assess_landlord on public.affordability_assessments(landlord_id);
create index if not exists idx_afford_assess_tenant on public.affordability_assessments(tenant_id);

-- ---------------------------------------------------------------------------
-- Consent (POPIA) — processing is blocked until a 'granted' row exists.
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_consents (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  landlord_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  consent_text text not null,
  status text not null default 'granted' check (status in ('granted','withdrawn')),
  ip_address inet,
  user_agent text,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists idx_afford_consent_assessment on public.affordability_consents(assessment_id);

-- ---------------------------------------------------------------------------
-- Uploaded documents (private storage; never public).
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_documents (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  content_type text,
  byte_size bigint,
  sha256 text,
  status text not null default 'uploaded'
    check (status in ('uploaded','validating','virus_scanning','clean','infected','rejected','processed','failed','deleted')),
  page_count int,
  has_text_layer boolean,
  detected_bank text,
  rejection_reason text,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_afford_docs_assessment on public.affordability_documents(assessment_id);

-- ---------------------------------------------------------------------------
-- Per-page extraction metadata (text vs OCR, confidence, page-level warnings).
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_pages (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  document_id uuid not null references public.affordability_documents(id) on delete cascade,
  page_number int not null,
  has_text boolean,
  ocr_used boolean default false,
  extraction_confidence numeric(4,3),
  warnings jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_pages_doc on public.affordability_pages(document_id);

-- ---------------------------------------------------------------------------
-- Normalised transactions (source-traceable).
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_transactions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  document_id uuid references public.affordability_documents(id) on delete set null,
  txn_date date,
  value_date date,
  description text,
  amount numeric(14,2),
  direction text not null default 'unknown' check (direction in ('credit','debit','unknown')),
  balance_after numeric(14,2),
  category text,
  subcategory text,
  is_recurring boolean default false,
  recurrence_frequency text,
  is_own_account_transfer boolean default false,
  is_excluded boolean default false,       -- transfers/loans/refunds/duplicates excluded from income
  exclusion_reason text,
  confidence_score numeric(4,3),
  classified_by text not null default 'rules' check (classified_by in ('rules','ai','manual')),
  ai_reason text,                          -- stored when AI classified an ambiguous description
  source_page int,
  raw_text text,
  validation_status text not null default 'requires_review'
    check (validation_status in ('validated','low_confidence','failed_validation','requires_review')),
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_txn_assessment on public.affordability_transactions(assessment_id);
create index if not exists idx_afford_txn_category on public.affordability_transactions(assessment_id, category);

-- ---------------------------------------------------------------------------
-- Derived income sources & expense categories (link back to transactions).
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_income_sources (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  label text,
  category text,
  is_verified_recurring boolean default false,
  frequency text,
  average_monthly_amount numeric(14,2),
  months_present int,
  transaction_ids uuid[],
  confidence_score numeric(4,3),
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_income_assessment on public.affordability_income_sources(assessment_id);

create table if not exists public.affordability_expense_categories (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  category text not null,
  average_monthly_amount numeric(14,2),
  is_recurring boolean default false,
  transaction_ids uuid[],
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_expense_assessment on public.affordability_expense_categories(assessment_id);

-- ---------------------------------------------------------------------------
-- Warnings (neutral severities — never a fraud accusation) & reason codes.
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_warnings (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  document_id uuid references public.affordability_documents(id) on delete set null,
  code text not null,
  severity text not null default 'warning'
    check (severity in ('info','warning','unable_to_verify','potential_integrity')),
  message text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_warn_assessment on public.affordability_warnings(assessment_id);

create table if not exists public.affordability_reason_codes (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  code text not null,
  message text not null,
  polarity text check (polarity in ('positive','review','negative','neutral')),
  metrics jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_reason_assessment on public.affordability_reason_codes(assessment_id);

-- ---------------------------------------------------------------------------
-- Landlord/admin reviews (internal — NOT visible to the tenant).
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_reviews (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('note','marked_reviewed','override_recommendation',
    'requested_more_info','requested_another_statement')),
  note text,
  override_recommendation text
    check (override_recommendation in ('strong','acceptable','further_review','insufficient')),
  override_reason text,     -- required when overriding (enforced in API)
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_review_assessment on public.affordability_reviews(assessment_id);

-- ---------------------------------------------------------------------------
-- Correction requests (tenant or landlord) & append-only audit trail.
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_correction_requests (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  requester_role text check (requester_role in ('tenant','landlord')),
  message text not null,
  target_transaction_id uuid references public.affordability_transactions(id) on delete set null,
  status text not null default 'open' check (status in ('open','in_review','resolved','rejected')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_afford_correction_assessment on public.affordability_correction_requests(assessment_id);

create table if not exists public.affordability_audit_events (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.affordability_assessments(id) on delete set null,
  application_id uuid,
  actor_id uuid,
  actor_role text,
  event_type text not null,
  detail jsonb,          -- NEVER store raw statement/transaction data here
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_afford_audit_assessment on public.affordability_audit_events(assessment_id);

-- ---------------------------------------------------------------------------
-- Background processing jobs (state machine, retries, idempotency).
-- ---------------------------------------------------------------------------
create table if not exists public.affordability_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  status text not null default 'uploaded'
    check (status in ('uploaded','validating','virus_scanning','extracting_text','running_ocr',
      'detecting_bank','extracting_transactions','categorising_transactions','validating_balances',
      'calculating_affordability','generating_report','completed','requires_review','failed')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  progress int not null default 0,
  last_error text,
  idempotency_key text unique,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_afford_jobs_status on public.affordability_processing_jobs(status);

-- ---------------------------------------------------------------------------
-- Visibility helpers (SECURITY DEFINER so child-table RLS can check the parent
-- without recursive RLS). All writes happen via the service role (edge
-- functions / worker), so no INSERT/UPDATE/DELETE policies are granted here.
-- ---------------------------------------------------------------------------
create or replace function public.affordability_visible(a_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.affordability_assessments a
    where a.id = a_id
      and (a.tenant_id = auth.uid() or a.landlord_id = auth.uid() or public.is_admin(auth.uid()))
  );
$$;

create or replace function public.affordability_visible_staff(a_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.affordability_assessments a
    where a.id = a_id
      and (a.landlord_id = auth.uid() or public.is_admin(auth.uid()))
  );
$$;

-- Parent table policy: tenant, landlord, or admin may read their own row.
alter table public.affordability_assessments enable row level security;
drop policy if exists affordability_assessments_read on public.affordability_assessments;
create policy affordability_assessments_read on public.affordability_assessments
  for select using (tenant_id = auth.uid() or landlord_id = auth.uid() or public.is_admin(auth.uid()));

-- Child tables shared with the tenant: readable by any party to the assessment.
do $$
declare t text;
begin
  foreach t in array array[
    'affordability_consents','affordability_documents','affordability_pages',
    'affordability_transactions','affordability_income_sources','affordability_expense_categories',
    'affordability_warnings','affordability_reason_codes','affordability_correction_requests',
    'affordability_processing_jobs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select using (public.affordability_visible(assessment_id))',
      t || '_read', t);
  end loop;
end $$;

-- Staff-only tables (tenant must NOT see internal reviews / audit trail).
alter table public.affordability_reviews enable row level security;
drop policy if exists affordability_reviews_read on public.affordability_reviews;
create policy affordability_reviews_read on public.affordability_reviews
  for select using (public.affordability_visible_staff(assessment_id));

alter table public.affordability_audit_events enable row level security;
drop policy if exists affordability_audit_read on public.affordability_audit_events;
create policy affordability_audit_read on public.affordability_audit_events
  for select using (
    public.is_admin(auth.uid())
    or (assessment_id is not null and public.affordability_visible_staff(assessment_id))
  );

-- updated_at maintenance (reuse the project's existing trigger fn).
drop trigger if exists trg_afford_assess_updated on public.affordability_assessments;
create trigger trg_afford_assess_updated before update on public.affordability_assessments
  for each row execute function public.set_updated_at();
drop trigger if exists trg_afford_jobs_updated on public.affordability_processing_jobs;
create trigger trg_afford_jobs_updated before update on public.affordability_processing_jobs
  for each row execute function public.set_updated_at();

-- Audit helper (edge functions call this; never logs raw statement data).
create or replace function public.affordability_audit(
  p_assessment uuid,
  p_event text,
  p_actor uuid default null,
  p_role text default null,
  p_detail jsonb default null,
  p_ip inet default null,
  p_ua text default null
) returns void language sql security definer set search_path = public as $$
  insert into public.affordability_audit_events(
    assessment_id, application_id, actor_id, actor_role, event_type, detail, ip_address, user_agent)
  select p_assessment, a.application_id, p_actor, p_role, p_event, p_detail, p_ip, p_ua
  from public.affordability_assessments a where a.id = p_assessment;
$$;

-- ---------------------------------------------------------------------------
-- Private storage bucket for statements. No storage.objects policies are
-- added, so the bucket is fully private; access is only via short-lived signed
-- URLs issued by service-role edge functions.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('affordability-statements', 'affordability-statements', false)
on conflict (id) do nothing;
