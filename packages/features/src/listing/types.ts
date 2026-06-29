export interface ListingFormData {
  property_type: string;
  location: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm?: number;
  furnished: boolean;
  pets_allowed: boolean;
  amenities: string[];
  price: number;
  available_from?: string;
  images: File[];
}

export interface SaleListingFormData extends ListingFormData {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  preferred_contact_method: 'phone' | 'email' | 'both';
}
