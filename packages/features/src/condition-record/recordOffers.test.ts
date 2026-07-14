import { describe, expect, it } from 'vitest';
import { missingRecordOffers } from './recordOffers';
import type { TenancySummary } from './hooks/useConditionRecords';

const tenancy = (over: Partial<TenancySummary> = {}): TenancySummary => ({
  id: 't1',
  property_id: 'p1',
  tenant_id: 'u-tenant',
  landlord_id: 'u-landlord',
  start_date: '2026-07-01',
  end_date: '2027-06-30',
  status: 'active',
  ...over,
});

const today = new Date('2026-07-16T12:00:00Z');
const offersFor = (
  t: TenancySummary,
  records: { tenancy_id: string; event_type: string }[] = [],
) => missingRecordOffers(records, [t], today).map((o) => o.eventType);

describe('missingRecordOffers', () => {
  it('offers move-in for an active tenancy without one', () => {
    expect(offersFor(tenancy())).toEqual(['move_in']);
  });

  it('does not offer records that already exist', () => {
    expect(
      offersFor(tenancy({ end_date: '2026-07-20' }), [
        { tenancy_id: 't1', event_type: 'move_in' },
        { tenancy_id: 't1', event_type: 'move_out' },
      ]),
    ).toEqual([]);
  });

  it('does not offer move-out while the tenancy end is far away', () => {
    expect(offersFor(tenancy({ end_date: '2027-06-30' }))).toEqual(['move_in']);
  });

  it('offers move-out inside the 30-day window before tenancy end', () => {
    expect(offersFor(tenancy({ end_date: '2026-08-10' }))).toEqual(['move_in', 'move_out']);
  });

  it('offers move-out up to 30 days after the end, even for a non-active tenancy', () => {
    expect(offersFor(tenancy({ end_date: '2026-07-01', status: 'ended' }))).toEqual(['move_out']);
  });

  it('offers nothing for a long-ended tenancy', () => {
    expect(offersFor(tenancy({ end_date: '2026-01-31', status: 'ended' }))).toEqual([]);
  });

  it('does not offer move-in for a non-active tenancy', () => {
    expect(offersFor(tenancy({ status: 'pending' }))).toEqual([]);
  });
});
