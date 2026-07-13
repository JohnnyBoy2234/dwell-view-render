import { describe, expect, it } from 'vitest';
import {
  applicationStatusPresentation,
  DRAFT_PRESENTATION,
  duplicateRequestReason,
  EXPIRED_INVITE_PRESENTATION,
  INVITE_PRESENTATION,
  isInviteExpired
} from './applicationPresentation';

describe('applicationStatusPresentation', () => {
  it('groups landlord-created invited rows under Invitations with a start CTA', () => {
    const p = applicationStatusPresentation('invited');
    expect(p.tab).toBe('invitations');
    expect(p.cta).toBe('Start application');
  });

  it('maps a submitted application to a review state with a view CTA', () => {
    for (const status of ['pending', 'submitted']) {
      const p = applicationStatusPresentation(status);
      expect(p.label).toBe('Submitted');
      expect(p.cta).toBe('View submitted application');
      expect(p.tab).toBe('applications');
      expect(p.terminal).toBe(false);
    }
  });

  it('says what was accepted: the application, terminally', () => {
    const p = applicationStatusPresentation('accepted');
    expect(p.label).toBe('Application approved');
    expect(p.terminal).toBe(true);
  });

  it('presents declined without labelling the tenant', () => {
    const p = applicationStatusPresentation('declined');
    expect(p.label).toBe('Unsuccessful');
    expect(p.cta).toBe('View decision');
  });

  it('falls back safely for unknown statuses', () => {
    const p = applicationStatusPresentation('something_new');
    expect(p.tab).toBe('applications');
    expect(p.cta).toBe('View application status');
  });

  it('gives drafts a continue CTA and invites a start CTA', () => {
    expect(DRAFT_PRESENTATION.cta).toBe('Continue application');
    expect(INVITE_PRESENTATION.cta).toBe('Start application');
    expect(EXPIRED_INVITE_PRESENTATION.cta).toBeNull();
  });
});

describe('isInviteExpired', () => {
  it('flags past expiry and accepts future or missing expiry', () => {
    expect(isInviteExpired({ expires_at: new Date(Date.now() - 1000).toISOString() })).toBe(true);
    expect(isInviteExpired({ expires_at: new Date(Date.now() + 86400000).toISOString() })).toBe(false);
    expect(isInviteExpired({ expires_at: null })).toBe(false);
  });
});

describe('duplicateRequestReason', () => {
  const base = {
    propertyId: 'p1',
    activeInvitePropertyIds: [] as string[],
    applications: [] as { property_id: string; status: string }[],
    draftPropertyIds: [] as string[],
    pendingRequestPropertyIds: [] as string[]
  };

  it('allows a request when nothing exists for the property', () => {
    expect(duplicateRequestReason(base)).toBeNull();
  });

  it('points to the invitation when one already exists', () => {
    const reason = duplicateRequestReason({ ...base, activeInvitePropertyIds: ['p1'] });
    expect(reason?.action).toBe('view-invitation');
  });

  it('points to the draft when the tenant already started applying', () => {
    const reason = duplicateRequestReason({ ...base, draftPropertyIds: ['p1'] });
    expect(reason?.action).toBe('continue-application');
  });

  it('treats an invited application row as an invitation', () => {
    const reason = duplicateRequestReason({ ...base, applications: [{ property_id: 'p1', status: 'invited' }] });
    expect(reason?.action).toBe('view-invitation');
  });

  it('points to the application when one was submitted', () => {
    const reason = duplicateRequestReason({ ...base, applications: [{ property_id: 'p1', status: 'pending' }] });
    expect(reason?.action).toBe('view-application');
  });

  it('blocks repeat requests that are still pending', () => {
    const reason = duplicateRequestReason({ ...base, pendingRequestPropertyIds: ['p1'] });
    expect(reason?.message).toContain('already been sent');
    expect(reason?.action).toBeNull();
  });

  it('ignores records for other properties', () => {
    const reason = duplicateRequestReason({
      ...base,
      activeInvitePropertyIds: ['p2'],
      applications: [{ property_id: 'p3', status: 'pending' }],
      pendingRequestPropertyIds: ['p4']
    });
    expect(reason).toBeNull();
  });
});
