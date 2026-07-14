import type { ConditionEventType } from '@mzanzihomes/common';
import type { TenancySummary } from './hooks/useConditionRecords';

export interface RecordOffer {
  tenancy: TenancySummary;
  eventType: ConditionEventType;
}

// Move-out is only offered near the tenancy end: 30 days before (wider than the
// 14-day cron auto-create window) through 30 days after (covers tenancies whose
// status flipped before anyone started the record). Move-in is offered for the
// whole active tenancy — a missing move-in record can be started late.
const MOVE_OUT_WINDOW_DAYS = 30;

export function missingRecordOffers(
  records: { tenancy_id: string; event_type: string }[],
  tenancies: TenancySummary[],
  today: Date = new Date(),
): RecordOffer[] {
  const have = new Set(records.map((r) => `${r.tenancy_id}:${r.event_type}`));
  const offers: RecordOffer[] = [];
  for (const tenancy of tenancies) {
    if (tenancy.status === 'active' && !have.has(`${tenancy.id}:move_in`)) {
      offers.push({ tenancy, eventType: 'move_in' });
    }
    const daysToEnd =
      (new Date(tenancy.end_date).getTime() - today.getTime()) / 86_400_000;
    if (Math.abs(daysToEnd) <= MOVE_OUT_WINDOW_DAYS && !have.has(`${tenancy.id}:move_out`)) {
      offers.push({ tenancy, eventType: 'move_out' });
    }
  }
  return offers;
}
