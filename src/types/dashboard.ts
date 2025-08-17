export interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  status: string;
  created_at: string;
  featured: boolean;
  images?: string[];
  landlord_id: string;
}

export interface Tenancy {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  lease_document_url?: string;
  lease_status?: string;
  notes?: string;
  tenant_name: string;
  tenant_email: string;
  property_title: string;
}

export interface PropertyCardProps {
  property: Property;
  inquiriesCount: number;
  applicationsCount: number;
  activeTenancy?: Tenancy;
}

export interface FindTenantsTabProps {
  property: Property;
  inquiriesCount: number;
  applicationsCount: number;
}

export interface ManageTenantsTabProps {
  property: Property;
  activeTenancy?: Tenancy;
}