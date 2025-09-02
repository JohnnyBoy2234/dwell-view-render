export type Priority = 'low' | 'medium' | 'high' | 'emergency';
export type MaintenanceStatus = 'submitted' | 'in_progress' | 'completed' | 'cancelled';
export type Category = 'plumbing' | 'electrical' | 'appliances' | 'pest' | 'general' | 'other';
export type Role = 'TENANT' | 'LANDLORD' | 'CONTRACTOR';

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  status: MaintenanceStatus;
  estimated_cost?: number;
  actual_cost?: number;
  scheduled_date?: string;
  completed_date?: string;
  contractor_name?: string;
  contractor_contact?: string;
  images?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceRequest {
  property_id: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  images?: string[];
}

export interface MaintenanceMessage {
  id: string;
  ticketId: string;
  senderUserId: string;
  senderRole: Role;
  recipientUserId: string;
  body: string;
  attachments?: string[];
  createdAt: string;
  readAt?: string;
}

export interface TicketUnreadSummary {
  ticketId: string;
  unreadCountForCurrentUser: number;
  lastMessageSnippet: string;
  lastMessageAt: string;
}