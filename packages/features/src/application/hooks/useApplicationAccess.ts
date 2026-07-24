import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';

/**
 * Unified application-access state for a (property, tenant) pair — the single
 * state machine that links a tenant's "request to apply" and a landlord's
 * "invite to apply" so neither side can start a duplicate journey (§7).
 *
 * Backed by the `application_access_status` SQL function (migration
 * 20260728000000), which returns the most-advanced state across requests,
 * invites, drafts and submitted applications.
 */
export type ApplicationAccessStatus =
  | 'none'
  | 'tenant_requested'
  | 'landlord_invited'
  | 'approved_to_apply'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'request_declined'
  | 'application_started'
  | 'application_submitted'
  | 'application_withdrawn';

/** Human-friendly line for each state, phrased for the given viewer. */
export function accessStatusLabel(
  status: ApplicationAccessStatus,
  viewer: 'tenant' | 'landlord',
): string {
  const tenant: Record<ApplicationAccessStatus, string> = {
    none: '',
    tenant_requested: 'Your request to apply has already been sent.',
    landlord_invited: 'You have already been invited to apply.',
    approved_to_apply: 'You can now start your application.',
    invitation_accepted: 'Invitation accepted — continue your application.',
    invitation_declined: 'You declined this invitation.',
    request_declined: 'Your request was declined.',
    application_started: 'Your application is in progress.',
    application_submitted: 'Your application has been submitted.',
    application_withdrawn: 'You withdrew this application.',
  };
  const landlord: Record<ApplicationAccessStatus, string> = {
    none: '',
    tenant_requested: 'This tenant has already requested to apply.',
    landlord_invited: 'You have already invited this tenant.',
    approved_to_apply: 'Approved — waiting for the tenant to apply.',
    invitation_accepted: 'The tenant accepted your invitation.',
    invitation_declined: 'The tenant declined your invitation.',
    request_declined: 'You declined this request.',
    application_started: 'The tenant has started their application.',
    application_submitted: 'The tenant has submitted their application.',
    application_withdrawn: 'The tenant withdrew their application.',
  };
  return (viewer === 'tenant' ? tenant : landlord)[status] ?? '';
}

/** True when a NEW request or invite must not be created for this pair. */
export function blocksNewInvite(status: ApplicationAccessStatus): boolean {
  return status !== 'none' && status !== 'request_declined' && status !== 'invitation_declined';
}

export function useApplicationAccess(propertyId?: string | null, tenantId?: string | null) {
  const [status, setStatus] = useState<ApplicationAccessStatus>('none');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!propertyId || !tenantId) { setStatus('none'); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('application_access_status', {
      p_property: propertyId,
      p_tenant: tenantId,
    });
    if (!error && typeof data === 'string') setStatus(data as ApplicationAccessStatus);
    setLoading(false);
  }, [propertyId, tenantId]);

  useEffect(() => { load(); }, [load]);

  return { status, loading, refresh: load };
}
