import { describe, it, expect } from 'vitest';
import {
  conditionRecordState,
  groupPhotosByLocation,
  LOCATION_TAGS,
  type ConditionRecord,
  type ConditionPhoto,
} from './conditionRecord';

const base: ConditionRecord = {
  id: 'r1',
  tenancy_id: 't1',
  event_type: 'move_in',
  attestation_text: 'text',
  tenant_attested_at: null,
  landlord_attested_at: null,
  tenant_notes: null,
  landlord_notes: null,
  locked: false,
  created_at: '2026-07-09T00:00:00Z',
  updated_at: '2026-07-09T00:00:00Z',
};

const photo = (id: string, location_tag: string, created_at: string): ConditionPhoto => ({
  id,
  record_id: 'r1',
  uploaded_by: 'u1',
  location_tag,
  caption: null,
  storage_path: `r1/${id}.jpg`,
  created_at,
});

describe('conditionRecordState', () => {
  it('is open when nobody has attested', () => {
    expect(conditionRecordState(base)).toBe('open');
  });
  it('awaits the landlord when only the tenant attested', () => {
    expect(conditionRecordState({ ...base, tenant_attested_at: '2026-07-09T10:00:00Z' })).toBe('awaiting_landlord');
  });
  it('awaits the tenant when only the landlord attested', () => {
    expect(conditionRecordState({ ...base, landlord_attested_at: '2026-07-09T10:00:00Z' })).toBe('awaiting_tenant');
  });
  it('is locked when both attested', () => {
    expect(
      conditionRecordState({
        ...base,
        tenant_attested_at: '2026-07-09T10:00:00Z',
        landlord_attested_at: '2026-07-09T11:00:00Z',
        locked: true,
      }),
    ).toBe('locked');
  });
});

describe('groupPhotosByLocation', () => {
  it('groups photos by tag in LOCATION_TAGS order, unknown tags last alphabetically', () => {
    const groups = groupPhotosByLocation([
      photo('p1', 'Garage', '2026-07-09T10:00:00Z'),
      photo('p2', 'Kitchen', '2026-07-09T10:01:00Z'),
      photo('p3', 'Attic', '2026-07-09T10:02:00Z'),
      photo('p4', 'Kitchen', '2026-07-09T10:03:00Z'),
    ]);
    expect(groups.map((g) => g.location)).toEqual(['Kitchen', 'Garage', 'Attic']);
    expect(groups[0].photos.map((p) => p.id)).toEqual(['p2', 'p4']);
  });
  it('orders photos within a group by created_at ascending', () => {
    const groups = groupPhotosByLocation([
      photo('later', 'Kitchen', '2026-07-09T12:00:00Z'),
      photo('earlier', 'Kitchen', '2026-07-09T09:00:00Z'),
    ]);
    expect(groups[0].photos.map((p) => p.id)).toEqual(['earlier', 'later']);
  });
  it('returns empty array for no photos', () => {
    expect(groupPhotosByLocation([])).toEqual([]);
  });
  it('exposes a fixed tag list including numbered bedrooms', () => {
    expect(LOCATION_TAGS).toContain('Bedroom 2');
    expect(LOCATION_TAGS).toContain('Other');
  });
});
