-- §6: tamper-evident, hash-chained audit log for the lease lifecycle. Each
-- entry's hash covers the previous entry's hash, so any edit/deletion breaks
-- the chain. Built automatically by triggers — the signing edge functions are
-- untouched.

create table if not exists public.lease_audit_chain (
  id uuid primary key default gen_random_uuid(),
  lease_contract_id uuid not null references public.lease_contracts(id) on delete cascade,
  seq integer not null,
  event_type text not null,
  actor_id uuid,
  details jsonb not null default '{}'::jsonb,
  prev_hash text not null,
  entry_hash text not null,
  created_at timestamptz not null default now(),
  unique (lease_contract_id, seq)
);
create index if not exists idx_lease_audit_chain_lease on public.lease_audit_chain(lease_contract_id, seq);

alter table public.lease_audit_chain enable row level security;
create policy "lease_audit_chain_select_parties" on public.lease_audit_chain
  for select using (
    exists (select 1 from public.lease_contracts lc
            where lc.id = lease_audit_chain.lease_contract_id
              and (lc.landlord_id = auth.uid() or lc.tenant_id = auth.uid()))
  );

create or replace function public.lease_audit_append(
  p_lease uuid, p_event text, p_actor uuid, p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_prev text; v_seq integer; v_payload text; v_hash text;
begin
  select entry_hash, seq into v_prev, v_seq
  from public.lease_audit_chain where lease_contract_id = p_lease
  order by seq desc limit 1 for update;
  if v_prev is null then v_prev := 'GENESIS'; v_seq := 0; end if;
  v_payload := p_lease::text || '|' || (v_seq + 1)::text || '|' || coalesce(p_event,'') || '|'
             || coalesce(p_actor::text,'') || '|' || coalesce(p_details::text,'{}') || '|'
             || now()::text || '|' || v_prev;
  v_hash := encode(digest(v_payload, 'sha256'), 'hex');
  insert into public.lease_audit_chain (lease_contract_id, seq, event_type, actor_id, details, prev_hash, entry_hash)
  values (p_lease, v_seq + 1, p_event, p_actor, coalesce(p_details, '{}'::jsonb), v_prev, v_hash);
end; $$;

create or replace function public.lease_audit_verify(p_lease uuid)
returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare r record; v_prev text := 'GENESIS'; v_payload text; v_hash text;
begin
  for r in select * from public.lease_audit_chain where lease_contract_id = p_lease order by seq asc loop
    if r.prev_hash <> v_prev then return false; end if;
    v_payload := r.lease_contract_id::text || '|' || r.seq::text || '|' || coalesce(r.event_type,'') || '|'
               || coalesce(r.actor_id::text,'') || '|' || coalesce(r.details::text,'{}') || '|'
               || r.created_at::text || '|' || r.prev_hash;
    v_hash := encode(digest(v_payload, 'sha256'), 'hex');
    if r.entry_hash <> v_hash then return false; end if;
    v_prev := r.entry_hash;
  end loop;
  return true;
end; $$;

create or replace function public.trg_lease_audit_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.lease_audit_append(new.id, 'lease_created', new.landlord_id,
    jsonb_build_object('status', new.status, 'title', new.title));
  return new;
end; $$;
drop trigger if exists lease_audit_created on public.lease_contracts;
create trigger lease_audit_created after insert on public.lease_contracts
  for each row execute function public.trg_lease_audit_created();

create or replace function public.trg_lease_audit_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.lease_audit_append(new.id, 'status_' || coalesce(new.status,'unknown'), auth.uid(),
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end; $$;
drop trigger if exists lease_audit_status on public.lease_contracts;
create trigger lease_audit_status after update of status on public.lease_contracts
  for each row execute function public.trg_lease_audit_status();

create or replace function public.trg_lease_audit_signature() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.lease_audit_append(new.lease_contract_id, 'signed_' || coalesce(new.signer_role,'party'), new.signer_id,
    jsonb_build_object('signature_hash', new.signature_hash, 'document_hash', new.document_hash,
                       'ip', new.ip_address, 'consent_method', new.consent_method));
  return new;
end; $$;
drop trigger if exists lease_audit_signature on public.signature_audit;
create trigger lease_audit_signature after insert on public.signature_audit
  for each row execute function public.trg_lease_audit_signature();
