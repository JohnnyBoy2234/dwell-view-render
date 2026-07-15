import { describe, it, expect } from 'vitest';
import {
  conditionRecordState,
  groupPhotosByLocation,
  locationTagsForProperty,
  LOCATION_TAGS,
  type ConditionRecord,
  type ConditionPhoto,
} from './conditionRecord';

const base: ConditionRecord = {
  id: 'r1',
  tenancy_id: 't1',
  event_type: 'move_in',
  attestation_text: 'text',
  state: 'open',
  tenant_attested_at: null,
  landlord_attested_at: null,
  tenant_attested_by: null,
  landlord_attested_by: null,
  tenant_receipt_at: null,
  landlord_receipt_at: null,
  signoff_at: null,
  signoff_by: null,
  window_started_at: null,
  window_days: 7,
  tenant_notes: null,
  landlord_notes: null,
  locked: false,
  pdf_path: null,
  pdf_generated_at: null,
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
  dispute_id: null,
  item_id: null,
  created_at,
});

describe('conditionRecordState', () => {
  it('returns the record state column verbatim', () => {
    expect(conditionRecordState(base)).toBe('open');
    expect(conditionRecordState({ ...base, state: 'awaiting_receipts' })).toBe('awaiting_receipts');
    expect(conditionRecordState({ ...base, state: 'awaiting_approval' })).toBe('awaiting_approval');
    expect(conditionRecordState({ ...base, state: 'locked', locked: true })).toBe('locked');
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
  it('respects a custom tag order and appends unknown tags', () => {
    const groups = groupPhotosByLocation(
      [
        photo('p1', 'Kitchen', '2026-07-09T10:00:00Z'),
        photo('p2', 'Bedroom 1', '2026-07-09T10:01:00Z'),
        photo('p3', 'Wine Cellar', '2026-07-09T10:02:00Z'),
      ],
      ['Bedroom 1', 'Kitchen'],
    );
    expect(groups.map((g) => g.location)).toEqual(['Bedroom 1', 'Kitchen', 'Wine Cellar']);
  });
});

describe('locationTagsForProperty', () => {
  it('generates numbered bedrooms and bathrooms from the counts', () => {
    const tags = locationTagsForProperty({ bedrooms: 3, bathrooms: 2 });
    expect(tags).toContain('Bedroom 1');
    expect(tags).toContain('Bedroom 3');
    expect(tags).not.toContain('Bedroom 4');
    expect(tags).toContain('Bathroom 2');
    expect(tags).not.toContain('Bathroom 3');
  });
  it('always includes the base areas plus Exterior and Other', () => {
    const tags = locationTagsForProperty({ bedrooms: 0, bathrooms: 0 });
    for (const t of ['Entrance', 'Passage', 'Kitchen', 'Lounge', 'Dining Room', 'Exterior', 'Other']) {
      expect(tags).toContain(t);
    }
    expect(tags.some((t) => t.startsWith('Bedroom'))).toBe(false);
  });
  it('adds Garage for parking and location amenities without duplicates', () => {
    const tags = locationTagsForProperty({
      bedrooms: 1,
      bathrooms: 1,
      parking_spaces: 2,
      amenities: ['Garden', 'Balcony', 'WiFi'],
    });
    expect(tags).toContain('Garage');
    expect(tags).toContain('Garden');
    expect(tags).toContain('Balcony');
    expect(tags).not.toContain('WiFi');
    expect(new Set(tags).size).toBe(tags.length);
  });
  it('falls back to the static list when property details are missing', () => {
    expect(locationTagsForProperty(null)).toEqual([...LOCATION_TAGS]);
    expect(locationTagsForProperty(undefined)).toEqual([...LOCATION_TAGS]);
  });
  it('handles junk counts gracefully', () => {
    const tags = locationTagsForProperty({ bedrooms: -3, bathrooms: Number.NaN, parking_spaces: null });
    expect(tags.some((t) => t.startsWith('Bedroom') || t.startsWith('Bathroom'))).toBe(false);
    expect(tags).not.toContain('Garage');
  });
});
