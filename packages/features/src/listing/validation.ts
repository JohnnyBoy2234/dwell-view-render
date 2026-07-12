// Pure listing validation rules and soft-warning helpers.
// Hard rules block; warnings render amber and never block.

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;

export const PRICE_MIN = 500;
export const PRICE_MAX = 500000;
export const PRICE_LOW_WARNING = 2000;
export const PRICE_HIGH_WARNING = 75000;
export const MIN_PHOTOS = 5;
export const RECOMMENDED_PHOTOS = 10;
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_SHORT_WARNING = 150;
export const MAX_ROOMS = 20;

export function priceWarning(price: number | undefined | null): string | null {
  if (!price || price <= 0) return null;
  if (price < PRICE_LOW_WARNING) return "That's unusually low — double-check the amount.";
  if (price > PRICE_HIGH_WARNING) return "That's unusually high for a rental — double-check the amount.";
  return null;
}

export function needsBathroomConfirm(
  bedrooms: number | undefined | null,
  bathrooms: number | undefined | null
): boolean {
  if (bedrooms == null || bathrooms == null) return false;
  if (Number.isNaN(Number(bedrooms)) || Number.isNaN(Number(bathrooms))) return false;
  return Number(bathrooms) > Number(bedrooms) + 2;
}

export function isValidPostalCode(code: string): boolean {
  return /^\d{4}$/.test((code ?? '').trim());
}

export function isValidSaPhone(phone: string): boolean {
  const cleaned = (phone ?? '').replace(/[\s-]/g, '');
  return /^(\+27|0)[1-9]\d{8}$/.test(cleaned);
}

export function descriptionWarning(text: string): string | null {
  const len = (text ?? '').trim().length;
  if (len >= DESCRIPTION_MIN && len < DESCRIPTION_SHORT_WARNING) {
    return 'Short descriptions get fewer enquiries — mention the layout, features and the area.';
  }
  return null;
}

export function composeLocation(parts: {
  suburb?: string;
  city?: string;
  province?: string;
}): string {
  return [parts.suburb, parts.city, parts.province]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

export interface PublishChecklist {
  blockers: string[];
  warnings: string[];
}

// `data` is the wizard form data; `profilePhone` is the landlord's profile
// phone (null/'' when missing). Photos count only URL strings (uploaded).
export function buildPublishChecklist(
  data: {
    suburb?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    description: string;
    parking_spaces?: number;
    amenities: string[];
    images: (File | string)[];
  },
  profilePhone: string | null | undefined
): PublishChecklist {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const uploaded = (data.images ?? []).filter((i) => typeof i === 'string');
  if (uploaded.length < MIN_PHOTOS) {
    blockers.push(`Add at least ${MIN_PHOTOS} photos (you have ${uploaded.length}).`);
  }

  if (
    !(data.suburb ?? '').trim() ||
    !(data.city ?? '').trim() ||
    !(data.province ?? '').trim() ||
    !isValidPostalCode(data.postal_code ?? '')
  ) {
    blockers.push('Complete the property address (suburb, city, province and postal code).');
  }

  if (!profilePhone || !isValidSaPhone(profilePhone)) {
    blockers.push('Add a phone number to your profile so tenants can be verified.');
  }

  const descLen = (data.description ?? '').trim().length;
  if (descLen >= DESCRIPTION_MIN && descLen < DESCRIPTION_SHORT_WARNING) {
    warnings.push('Your description is very short — longer descriptions get more enquiries.');
  }

  if (!data.parking_spaces || Number(data.parking_spaces) <= 0) {
    warnings.push('No parking information added.');
  }

  if (!data.amenities || data.amenities.length === 0) {
    warnings.push('No amenities selected — tick what your property offers.');
  }

  return { blockers, warnings };
}
