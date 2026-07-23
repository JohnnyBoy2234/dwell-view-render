import { supabase } from '@mzanzihomes/supabase/client';

export interface InfoRequest {
  id: string;
  application_id: string;
  landlord_id: string;
  tenant_id: string;
  item: string;
  message: string | null;
  due_date: string | null;
  status: 'open' | 'responded';
  response: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface ApplicationNote {
  id: string;
  note: string;
  created_at: string;
}

export interface ApplicationEvent {
  id: string;
  actor_id: string | null;
  event_type: string;
  detail: Record<string, unknown>;
  created_at: string;
}

const table = (name: string) => supabase.from(name) as any;

export async function listInfoRequests(applicationId: string): Promise<InfoRequest[]> {
  const { data, error } = await table('application_info_requests')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InfoRequest[];
}

/** Landlord asks for something specific; the application moves into the
 * more-info state so both sides see it is waiting on the tenant. */
export async function createInfoRequest(args: {
  applicationId: string;
  landlordId: string;
  tenantId: string;
  item: string;
  message?: string;
  dueDate?: string;
}): Promise<void> {
  const { error } = await table('application_info_requests').insert({
    application_id: args.applicationId,
    landlord_id: args.landlordId,
    tenant_id: args.tenantId,
    item: args.item,
    message: args.message || null,
    due_date: args.dueDate || null
  });
  if (error) throw error;

  const { error: statusError } = await table('applications')
    .update({ status: 'more_info_requested' })
    .eq('id', args.applicationId);
  if (statusError) throw statusError;
}

/** Tenant answers a request. The original request is immutable (DB trigger);
 * once no open requests remain the application returns to review. */
export async function respondToInfoRequest(request: InfoRequest, response: string): Promise<void> {
  const { error } = await table('application_info_requests')
    .update({ response, status: 'responded', responded_at: new Date().toISOString() })
    .eq('id', request.id);
  if (error) throw error;

  const { data: open } = await table('application_info_requests')
    .select('id')
    .eq('application_id', request.application_id)
    .eq('status', 'open');
  if (!open || open.length === 0) {
    await table('applications')
      .update({ status: 'pending' })
      .eq('id', request.application_id);
  }
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const { error } = await table('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId);
  if (error) throw error;
}

export async function listNotes(applicationId: string): Promise<ApplicationNote[]> {
  const { data, error } = await table('application_notes')
    .select('id, note, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApplicationNote[];
}

export async function addNote(applicationId: string, landlordId: string, note: string): Promise<ApplicationNote> {
  const { data, error } = await table('application_notes')
    .insert({ application_id: applicationId, landlord_id: landlordId, note })
    .select('id, note, created_at')
    .single();
  if (error) throw error;
  return data as ApplicationNote;
}

export async function listEvents(applicationId: string): Promise<ApplicationEvent[]> {
  const { data, error } = await table('application_events')
    .select('id, actor_id, event_type, detail, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApplicationEvent[];
}

export interface ConsentRecord {
  consented: boolean;
  consent_version: string;
  consent_text_snapshot: string;
  created_at: string;
}

export async function getConsentRecord(applicationId: string): Promise<ConsentRecord | null> {
  const { data } = await table('consents')
    .select('consented, consent_version, consent_text_snapshot, created_at')
    .eq('subject_type', 'application')
    .eq('subject_id', applicationId)
    .eq('consent_type', 'credit_check')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ConsentRecord) ?? null;
}
