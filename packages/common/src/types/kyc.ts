export type KycStatus = 'not_started' | 'submitted' | 'approved' | 'declined';

export interface KycProfile {
  user_id: string;
  status: KycStatus;
  id_doc_path?: string; // Legacy field, keep for backward compatibility
  id_front_path?: string;
  id_back_path?: string;
  selfie_path?: string;
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KycAuditLog {
  id: number;
  user_id: string;
  action: string;
  actor?: string;
  metadata?: any;
  created_at: string;
}

export interface FileUploadResponse {
  success: boolean;
  path?: string;
  error?: string;
}

export interface KycFormData {
  id_document?: File;
  selfie?: File;
  declaration?: boolean;
}

export interface PreviewUrlResponse {
  url?: string;
  error?: string;
}

export interface AdminKycListItem extends KycProfile {
  user_email: string;
  user_display_name: string;
}