import { Database } from '@/types/supabase';

export type ApplicationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ApplicationRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  status: ApplicationRequestStatus;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    address: string;
    image_url?: string;
  };
  tenant?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export type ApplicationRequestInsert = Database['public']['Tables']['application_requests']['Insert'];
export type ApplicationRequestUpdate = Database['public']['Tables']['application_requests']['Update'];

export interface ApplicationRequestWithDetails extends ApplicationRequest {
  property: {
    id: string;
    title: string;
    address: string;
    image_url?: string;
  };
  tenant: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ApplicationRequestFilters {
  status?: ApplicationRequestStatus;
  property_id?: string;
  tenant_id?: string;
  landlord_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApplicationRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface ApplicationRequestResponse {
  data: ApplicationRequestWithDetails[];
  count: number;
  stats: ApplicationRequestStats;
}
