-- AI plain-language summary of an affordability assessment.
--
-- This is an EXPLANATION layer only: it puts the deterministic engine's result
-- (recommendation, confidence, metrics, reason codes) into plain English for the
-- landlord. It never makes the rental decision and never introduces figures the
-- engine did not compute. Staff-only (landlord/admin) — the tenant must not see
-- the landlord-facing summary. Written only by the service-role edge function
-- (no client INSERT/UPDATE/DELETE policies).
create table if not exists public.affordability_ai_summaries (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.affordability_assessments(id) on delete cascade,
  summary text not null,
  model text,
  based_on_recommendation text,
  based_on_confidence text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists affordability_ai_summaries_assessment_idx
  on public.affordability_ai_summaries(assessment_id, created_at desc);

alter table public.affordability_ai_summaries enable row level security;
drop policy if exists affordability_ai_summaries_read on public.affordability_ai_summaries;
create policy affordability_ai_summaries_read on public.affordability_ai_summaries
  for select using (public.affordability_visible_staff(assessment_id));
