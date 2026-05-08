export enum ApplicationRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export interface ApplicationRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  status: ApplicationRequestStatus;
  message?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface ApplicationRequestInsert extends Omit<ApplicationRequest, 'id' | 'created_at' | 'updated_at'> {}
export interface ApplicationRequestUpdate extends Partial<Omit<ApplicationRequest, 'id' | 'created_at'>> {}

export interface ApplicationRequestFilters {
  status?: ApplicationRequestStatus;
  property_id?: string;
  tenant_id?: string;
  landlord_id?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ApplicationRequestResponse {
  data: ApplicationRequest[];
  count: number | null;
  error: Error | null;
}
