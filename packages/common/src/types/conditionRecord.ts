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

export const LOCATION_TAGS = [
  'Kitchen',
  'Living Room',
  'Dining Room',
  'Bedroom 1',
  'Bedroom 2',
  'Bedroom 3',
  'Bedroom 4',
  'Bathroom 1',
  'Bathroom 2',
  'Garage',
  'Exterior',
  'Garden',
  'Other',
] as const;

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
): { location: string; photos: ConditionPhoto[] }[] {
  const byTag = new Map<string, ConditionPhoto[]>();
  for (const p of photos) {
    const list = byTag.get(p.location_tag) ?? [];
    list.push(p);
    byTag.set(p.location_tag, list);
  }
  const known = LOCATION_TAGS.filter((t) => byTag.has(t)) as string[];
  const unknown = [...byTag.keys()]
    .filter((t) => !(LOCATION_TAGS as readonly string[]).includes(t))
    .sort();
  return [...known, ...unknown].map((location) => ({
    location,
    photos: [...byTag.get(location)!].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}
