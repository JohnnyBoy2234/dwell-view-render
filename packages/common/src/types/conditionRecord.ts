export type ConditionEventType = 'move_in' | 'move_out';
export type ConditionParty = 'tenant' | 'landlord';
// Two-stage signing state machine (Phase 1).
export type ConditionRecordState = 'open' | 'awaiting_receipts' | 'awaiting_approval' | 'locked';

export interface ConditionRecord {
  id: string;
  tenancy_id: string;
  event_type: ConditionEventType;
  attestation_text: string;
  state: ConditionRecordState;
  // Approval signatures (Stage 2)
  tenant_attested_at: string | null;
  landlord_attested_at: string | null;
  tenant_attested_by: string | null;
  landlord_attested_by: string | null;
  // Receipt signatures (Stage 1)
  tenant_receipt_at: string | null;
  landlord_receipt_at: string | null;
  signoff_at: string | null;
  signoff_by: string | null;
  window_started_at: string | null;
  window_days: number;
  tenant_notes: string | null;
  landlord_notes: string | null;
  locked: boolean;
  pdf_path: string | null;
  pdf_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConditionSignature {
  id: string;
  record_id: string;
  signer_id: string | null;
  party: ConditionParty;
  kind: 'receipt' | 'approval';
  auto: boolean;
  signed_at: string;
  ip: string | null;
  user_agent: string | null;
  consent_text: string | null;
}

export interface ConditionDispute {
  id: string;
  record_id: string;
  location_tag: string;
  raised_by: string | null;
  raised_party: ConditionParty;
  comment: string;
  status: 'open' | 'agreed' | 'disagreed';
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface ConditionAuditEntry {
  id: string;
  record_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ConditionPhoto {
  id: string;
  record_id: string;
  uploaded_by: string;
  location_tag: string;
  caption: string | null;
  storage_path: string;
  dispute_id: string | null;
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
  // The DB `state` column is authoritative; fall back for any row read before
  // the signing migration populated it.
  if (r.state) return r.state;
  if (r.tenant_attested_at && r.landlord_attested_at) return 'locked';
  return 'open';
}

// Deadline of the 7-day approval window, or null if not in that stage.
export function approvalWindowEndsAt(r: ConditionRecord): Date | null {
  if (r.state !== 'awaiting_approval' || !r.window_started_at) return null;
  const start = new Date(r.window_started_at);
  return new Date(start.getTime() + (r.window_days ?? 7) * 24 * 60 * 60 * 1000);
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
