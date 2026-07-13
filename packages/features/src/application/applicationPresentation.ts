import { supabase } from '@mzanzihomes/supabase/client';

/**
 * Central presentation mapping for the tenant Applications screen. Domain
 * status values stay untouched in the database; everything user-facing
 * (labels, descriptions, badge treatment, CTAs, tab grouping) derives from
 * here so no card component carries its own status switch.
 */

export type ApplicationsTab = 'invitations' | 'applications';

export interface StatusPresentation {
  /** Tenant-facing status label (sentence case). */
  label: string;
  /** One short sentence of context shown on the card. */
  description: string;
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  /** Extra badge classes for statuses the design system colours specially. */
  badgeClassName?: string;
  /** Primary action label; null when the state offers no useful action. */
  cta: string | null;
  /** Which tab the record belongs under. */
  tab: ApplicationsTab;
  /** No further tenant action can change this state. */
  terminal: boolean;
}

const UNKNOWN_STATUS: StatusPresentation = {
  label: 'In progress',
  description: 'Your application is being processed.',
  badgeVariant: 'outline',
  cta: 'View application status',
  tab: 'applications',
  terminal: false
};

/**
 * applications.status → presentation. Verified against the live flows:
 * 'invited' rows are landlord-created invitations-to-apply, 'pending' is a
 * tenant submission awaiting landlord review, and 'accepted'/'declined' are
 * the landlord's decision on the application (not a lease or tenancy).
 */
const APPLICATION_STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  invited: {
    label: 'Invited',
    description: 'You have been invited to apply for this property.',
    badgeVariant: 'secondary',
    cta: 'Start application',
    tab: 'invitations',
    terminal: false
  },
  requested: {
    label: 'Requested',
    description: 'Waiting for the landlord to respond to your request.',
    badgeVariant: 'outline',
    cta: null,
    tab: 'applications',
    terminal: false
  },
  pending: {
    label: 'Submitted',
    description: 'The landlord is reviewing your application.',
    badgeVariant: 'outline',
    cta: 'View submitted application',
    tab: 'applications',
    terminal: false
  },
  submitted: {
    label: 'Submitted',
    description: 'The landlord is reviewing your application.',
    badgeVariant: 'outline',
    cta: 'View submitted application',
    tab: 'applications',
    terminal: false
  },
  more_info_requested: {
    label: 'More information requested',
    description: 'The landlord has asked for more information before deciding.',
    badgeVariant: 'default',
    badgeClassName: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    cta: 'Provide information',
    tab: 'applications',
    terminal: false
  },
  accepted: {
    label: 'Approved',
    description: 'The landlord has approved your application.',
    badgeVariant: 'default',
    badgeClassName: 'bg-green-100 text-green-800 hover:bg-green-100',
    cta: 'View approval',
    tab: 'applications',
    terminal: true
  },
  declined: {
    label: 'Not approved',
    description: 'The landlord decided not to proceed with this application.',
    badgeVariant: 'destructive',
    cta: 'View decision',
    tab: 'applications',
    terminal: true
  },
  withdrawn: {
    label: 'Withdrawn',
    description: 'You withdrew this application.',
    badgeVariant: 'outline',
    cta: null,
    tab: 'applications',
    terminal: true
  },
  expired: {
    label: 'Expired',
    description: 'This application is no longer active.',
    badgeVariant: 'outline',
    cta: null,
    tab: 'applications',
    terminal: true
  }
};

export const applicationStatusPresentation = (status: string): StatusPresentation =>
  APPLICATION_STATUS_PRESENTATION[status] ?? UNKNOWN_STATUS;

export const DRAFT_PRESENTATION: StatusPresentation = {
  label: 'Draft',
  description: 'You have started this application but not submitted it.',
  badgeVariant: 'secondary',
  cta: 'Continue application',
  tab: 'applications',
  terminal: false
};

export const INVITE_PRESENTATION: StatusPresentation = {
  label: 'Invited',
  description: 'You have been invited to apply for this property.',
  badgeVariant: 'secondary',
  cta: 'Start application',
  tab: 'invitations',
  terminal: false
};

export const EXPIRED_INVITE_PRESENTATION: StatusPresentation = {
  label: 'Expired',
  description: 'This invitation is no longer valid. Ask the landlord for a new one.',
  badgeVariant: 'outline',
  cta: null,
  tab: 'invitations',
  terminal: true
};

export function isInviteExpired(invite: { expires_at?: string | null }): boolean {
  if (!invite.expires_at) return false;
  return new Date(invite.expires_at).getTime() < Date.now();
}

export interface DuplicateRequestCheckInput {
  propertyId: string;
  activeInvitePropertyIds: string[];
  applications: { property_id: string; status: string }[];
  draftPropertyIds: string[];
  pendingRequestPropertyIds: string[];
}

export interface DuplicateRequestReason {
  message: string;
  /** Suggested follow-up shown instead of sending a request. */
  action: 'view-invitation' | 'continue-application' | 'view-application' | null;
}

/**
 * Client-side duplicate check before sending a manual application request.
 * The application_requests unique constraint remains the server-side
 * guarantee; this exists to explain the situation instead of erroring.
 */
export function duplicateRequestReason(input: DuplicateRequestCheckInput): DuplicateRequestReason | null {
  const { propertyId } = input;
  if (input.activeInvitePropertyIds.includes(propertyId)) {
    return { message: 'You already have an invitation for this property.', action: 'view-invitation' };
  }
  if (input.draftPropertyIds.includes(propertyId)) {
    return { message: 'You already started an application for this property.', action: 'continue-application' };
  }
  const application = input.applications.find((a) => a.property_id === propertyId);
  if (application) {
    if (application.status === 'invited') {
      return { message: 'You already have an invitation for this property.', action: 'view-invitation' };
    }
    return { message: 'You already have an application for this property.', action: 'view-application' };
  }
  if (input.pendingRequestPropertyIds.includes(propertyId)) {
    return { message: 'An application request has already been sent for this property.', action: null };
  }
  return null;
}

/**
 * Fire-and-forget analytics via the platform's log_event RPC. Never include
 * identity numbers, documents, addresses, or message content in properties.
 */
export function trackApplicationsEvent(
  userId: string | undefined,
  name: string,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  if (!userId) return;
  void (supabase.rpc as any)('log_event', {
    _user_id: userId,
    _name: name,
    _properties: properties
  }).then(({ error }: { error: unknown }) => {
    if (error) console.warn('Analytics event failed', name);
  });
}
