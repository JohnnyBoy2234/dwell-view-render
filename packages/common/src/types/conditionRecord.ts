export type ConditionEventType = 'move_in' | 'move_out';
export type ConditionParty = 'tenant' | 'landlord';
export type ConditionRecordState = 'open' | 'awaiting_tenant' | 'awaiting_landlord' | 'locked';

export interface ConditionRecord {
  id: string;
  tenancy_id: string;
  event_type: ConditionEventType;
  attestation_text: string;
  tenant_attested_at: string | null;
  landlord_attested_at: string | null;
  tenant_attested_by: string | null;
  landlord_attested_by: string | null;
  tenant_notes: string | null;
  landlord_notes: string | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConditionPhoto {
  id: string;
  record_id: string;
  uploaded_by: string;
  location_tag: string;
  caption: string | null;
  storage_path: string;
  created_at: string;
}

// Fallback when the property row is unreadable or incomplete.
export const LOCATION_TAGS = [
  'Entrance',
  'Passage',
  'Kitchen',
  'Lounge',
  'Living Room',
  'Dining Room',
  'Bedroom 1',
  'Bedroom 2',
  'Bedroom 3',
  'Bedroom 4',
  'Bathroom 1',
  'Bathroom 2',
  'Garage',
  'Garden',
  'Balcony',
  'Exterior',
  'Other',
] as const;

export interface PropertyRoomInfo {
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  amenities?: string[] | null;
}

// Amenities that are photographable locations (subset of the listing amenity vocabulary).
const AMENITY_LOCATIONS = ['Garden', 'Balcony', 'Swimming Pool', 'Braai Area'];

export function locationTagsForProperty(property?: PropertyRoomInfo | null): string[] {
  if (!property) return [...LOCATION_TAGS];
  const tags = ['Entrance', 'Passage', 'Kitchen', 'Lounge', 'Dining Room'];
  const count = (n: number | null | undefined) =>
    Number.isFinite(n) ? Math.min(Math.max(Math.floor(n!), 0), 20) : 0;
  for (let i = 1; i <= count(property.bedrooms); i++) tags.push(`Bedroom ${i}`);
  for (let i = 1; i <= count(property.bathrooms); i++) tags.push(`Bathroom ${i}`);
  if (count(property.parking_spaces) > 0) tags.push('Garage');
  for (const a of AMENITY_LOCATIONS) {
    if (property.amenities?.includes(a)) tags.push(a);
  }
  tags.push('Exterior', 'Other');
  return [...new Set(tags)];
}

// Must match the DB column default in the condition_records migration verbatim.
export const ATTESTATION_TEXT =
  'Both parties confirm that the photographs in this record fairly represent the condition of the property as at the date of their agreement.';

export function conditionRecordState(r: ConditionRecord): ConditionRecordState {
  if (r.tenant_attested_at && r.landlord_attested_at) return 'locked';
  if (r.tenant_attested_at) return 'awaiting_landlord';
  if (r.landlord_attested_at) return 'awaiting_tenant';
  return 'open';
}

export function groupPhotosByLocation(
  photos: ConditionPhoto[],
  tagOrder: readonly string[] = LOCATION_TAGS,
): { location: string; photos: ConditionPhoto[] }[] {
  const byTag = new Map<string, ConditionPhoto[]>();
  for (const p of photos) {
    const list = byTag.get(p.location_tag) ?? [];
    list.push(p);
    byTag.set(p.location_tag, list);
  }
  // Tags outside the current order (e.g. photos taken before the property
  // details changed) still group and display — they sort after known tags.
  const known = tagOrder.filter((t) => byTag.has(t));
  const unknown = [...byTag.keys()].filter((t) => !tagOrder.includes(t)).sort();
  return [...known, ...unknown].map((location) => ({
    location,
    photos: [...byTag.get(location)!].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}
