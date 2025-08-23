export type Role = 'TENANT' | 'LANDLORD' | 'CONTRACTOR';

export interface MaintenanceMessage {
  id: string;
  ticketId: string;
  senderUserId: string;
  senderRole: Role;
  recipientUserId: string;
  body: string;
  attachments?: Array<{
    id: string;
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  createdAt: string;
  readAt?: string;
}

export interface TicketUnreadSummary {
  ticketId: string;
  unreadCountForCurrentUser: number;
  lastMessageSnippet: string;
  lastMessageAt: string;
}
