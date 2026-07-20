import type { LucideIcon } from 'lucide-react';
import { Camera, CalendarCheck } from 'lucide-react';
import { conditionRecordState, type ConditionEventType, type ConditionRecord } from '@mzanzihomes/common';
import type { ConditionRecordListItem, RecordOffer } from '@mzanzihomes/features/condition-record';

/** Inspection module accent (coral/red). */
export const CORAL = '#ef4444';

export const EVENT_LABEL: Record<ConditionEventType, string> = {
  move_in: 'Move-in inspection',
  move_out: 'Move-out inspection',
};

export const EVENT_ICON: Record<ConditionEventType, { icon: LucideIcon; color: string; bg: string }> = {
  move_in: { icon: Camera, color: CORAL, bg: 'bg-red-50' },
  move_out: { icon: CalendarCheck, color: '#3b82f6', bg: 'bg-blue-50' },
};

export type TenantInspectionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'review_required'
  | 'awaiting_landlord'
  | 'completed';

/** Maps the backend record state (+ the tenant's own attestation) to a
 * user-facing status from the tenant's point of view. */
export function tenantStatus(record: ConditionRecord | null): TenantInspectionStatus {
  if (!record) return 'not_started';
  const state = conditionRecordState(record);
  if (state === 'open') return 'in_progress';
  if (state === 'locked') return 'completed';
  if (state === 'awaiting_receipts') return 'submitted';
  // awaiting_approval
  if (!record.tenant_attested_at) return 'review_required';
  if (!record.landlord_attested_at) return 'awaiting_landlord';
  return 'completed';
}

// Semantic colours: grey = inactive, amber = pending, blue = awaiting other
// party, coral = action required, green = completed.
export const STATUS_META: Record<TenantInspectionStatus, { label: string; color: string }> = {
  not_started: { label: 'Not started', color: '#94a3b8' },
  in_progress: { label: 'In progress', color: '#f59e0b' },
  submitted: { label: 'Submitted', color: '#3b82f6' },
  review_required: { label: 'Review required', color: CORAL },
  awaiting_landlord: { label: 'Awaiting landlord', color: '#3b82f6' },
  completed: { label: 'Completed', color: '#16a34a' },
};

export interface HeroContent {
  eventType: ConditionEventType;
  statusLabel: string;
  statusColor: string;
  description: string;
  actionLabel: string;
  /** 'start' creates a record for `tenancyId`; 'open' navigates to `record`. */
  actionKind: 'start' | 'open';
  record: ConditionRecord | null;
  tenancyId: string | null;
}

function openHero(
  record: ConditionRecord,
  statusLabel: string,
  statusColor: string,
  description: string,
  actionLabel: string,
): HeroContent {
  return {
    eventType: record.event_type,
    statusLabel,
    statusColor,
    description,
    actionLabel,
    actionKind: 'open',
    record,
    tenancyId: null,
  };
}

/**
 * Picks the single most relevant inspection for the hero, prioritising work
 * the tenant must act on. Returns null when there's nothing to show (no records
 * and nothing startable).
 */
export function selectHero(records: ConditionRecordListItem[], offers: RecordOffer[]): HeroContent | null {
  const byState = (predicate: (r: ConditionRecord) => boolean) =>
    records.find((r) => predicate(r.record))?.record ?? null;

  // 1. Tenant must review + sign the landlord's submission.
  const reviewReq = byState(
    (r) => conditionRecordState(r) === 'awaiting_approval' && !r.tenant_attested_at,
  );
  if (reviewReq)
    return openHero(
      reviewReq,
      'Your review is required',
      CORAL,
      'The landlord has submitted their inspection. Review the evidence and complete your sign-off.',
      'Review and sign',
    );

  // 2. In progress — keep adding photos/notes.
  const open = byState((r) => conditionRecordState(r) === 'open');
  if (open)
    return openHero(
      open,
      'In progress',
      STATUS_META.in_progress.color,
      'Continue adding photos and notes before submitting your inspection.',
      'Continue inspection',
    );

  // 3. Startable inspection the tenant is allowed to begin (move-in first).
  const offer = offers.find((o) => o.eventType === 'move_in') ?? offers[0];
  if (offer)
    return {
      eventType: offer.eventType,
      statusLabel: 'Not started yet',
      statusColor: STATUS_META.not_started.color,
      description: 'Start the inspection to record the condition of the property.',
      actionLabel: 'Start inspection',
      actionKind: 'start',
      record: null,
      tenancyId: offer.tenancy.id,
    };

  // 4. Submitted by the tenant, waiting on the landlord.
  const awaitingLandlord = byState(
    (r) => conditionRecordState(r) === 'awaiting_approval' && !!r.tenant_attested_at && !r.landlord_attested_at,
  );
  if (awaitingLandlord)
    return openHero(
      awaitingLandlord,
      'Awaiting landlord review',
      STATUS_META.awaiting_landlord.color,
      'Your inspection has been submitted and is waiting for the landlord’s confirmation.',
      'View inspection',
    );

  // 5. Awaiting receipt signatures (intermediate submitted state).
  const receipts = byState((r) => conditionRecordState(r) === 'awaiting_receipts');
  if (receipts)
    return openHero(
      receipts,
      'Awaiting review',
      STATUS_META.submitted.color,
      'Your inspection has been submitted and is awaiting review.',
      'View inspection',
    );

  // 6. Completed and locked.
  const locked = byState((r) => conditionRecordState(r) === 'locked');
  if (locked)
    return openHero(
      locked,
      'Inspection completed',
      STATUS_META.completed.color,
      'Both parties have signed off and the inspection record is now securely stored.',
      'View report',
    );

  return null;
}
