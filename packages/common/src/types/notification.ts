export type NotificationType = 'lease' | 'maintenance' | 'application' | 'payment' | 'viewing' | 'system' | 'kyc' | 'inventory' | 'offer';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  title?: string;
  message: string;
  type: NotificationType | string | null;
  priority?: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  link_url: string | null;
  action_url?: string | null;
  metadata: any | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  action_url?: string;
  metadata?: any;
}

export interface NotificationFilters {
  type?: NotificationType;
  is_read?: boolean;
  priority?: NotificationPriority;
}
