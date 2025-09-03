import { supabase } from '@/integrations/supabase/client';
import { CreateNotificationData, NotificationType, NotificationPriority } from '@/types/notification';

export class NotificationService {
  /**
   * Create a notification for a specific user
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(notifications: CreateNotificationData[]) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Create lease-related notifications
   */
  static async createLeaseNotification(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    actionUrl?: string,
    metadata?: any
  ) {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'lease',
      priority,
      action_url: actionUrl,
      metadata
    });
  }

  /**
   * Create maintenance-related notifications
   */
  static async createMaintenanceNotification(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    actionUrl?: string,
    metadata?: any
  ) {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'maintenance',
      priority,
      action_url: actionUrl,
      metadata
    });
  }

  /**
   * Create application-related notifications
   */
  static async createApplicationNotification(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    actionUrl?: string,
    metadata?: any
  ) {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'application',
      priority,
      action_url: actionUrl,
      metadata
    });
  }

  /**
   * Create payment-related notifications
   */
  static async createPaymentNotification(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    actionUrl?: string,
    metadata?: any
  ) {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'payment',
      priority,
      action_url: actionUrl,
      metadata
    });
  }

  /**
   * Create viewing-related notifications
   */
  static async createViewingNotification(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    actionUrl?: string,
    metadata?: any
  ) {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'viewing',
      priority,
      action_url: actionUrl,
      metadata
    });
  }

  /**
   * Create system notifications
   */
  static async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    actionUrl?: string,
    metadata?: any
  ) {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'system',
      priority,
      action_url: actionUrl,
      metadata
    });
  }

  /**
   * Notify landlord about new lease signature
   */
  static async notifyLeaseSigned(landlordId: string, tenantName: string, propertyAddress: string, leaseId: string) {
    return this.createLeaseNotification(
      landlordId,
      'Lease Signed!',
      `${tenantName} has signed the lease for ${propertyAddress}. The lease is now complete.`,
      'high',
      `/enhancedlandlorddashboard/leases/${leaseId}`,
      { leaseId, tenantName, propertyAddress }
    );
  }

  /**
   * Notify tenant about new lease ready for signature
   */
  static async notifyLeaseReadyForSignature(tenantId: string, landlordName: string, propertyAddress: string, leaseId: string) {
    return this.createLeaseNotification(
      tenantId,
      'Lease Ready for Signature',
      `${landlordName} has prepared a lease for ${propertyAddress}. Please review and sign.`,
      'high',
      `/enhancedtenantdashboard/leases/${leaseId}`,
      { leaseId, landlordName, propertyAddress }
    );
  }

  /**
   * Notify about new maintenance request
   */
  static async notifyMaintenanceRequest(landlordId: string, tenantName: string, propertyAddress: string, requestId: string) {
    return this.createMaintenanceNotification(
      landlordId,
      'New Maintenance Request',
      `${tenantName} has submitted a maintenance request for ${propertyAddress}.`,
      'normal',
      `/enhancedlandlorddashboard/maintenance/${requestId}`,
      { requestId, tenantName, propertyAddress }
    );
  }

  /**
   * Notify about maintenance request status update
   */
  static async notifyMaintenanceStatusUpdate(tenantId: string, status: string, propertyAddress: string, requestId: string) {
    return this.createMaintenanceNotification(
      tenantId,
      'Maintenance Request Updated',
      `Your maintenance request for ${propertyAddress} has been ${status.toLowerCase()}.`,
      'normal',
      `/enhancedtenantdashboard/maintenance/${requestId}`,
      { requestId, status, propertyAddress }
    );
  }

  /**
   * Notify about new rental application
   */
  static async notifyNewApplication(landlordId: string, applicantName: string, propertyAddress: string, applicationId: string) {
    return this.createApplicationNotification(
      landlordId,
      'New Rental Application',
      `${applicantName} has applied for ${propertyAddress}.`,
      'normal',
      `/enhancedlandlorddashboard/applications/${applicationId}`,
      { applicationId, applicantName, propertyAddress }
    );
  }

  /**
   * Notify about application status update
   */
  static async notifyApplicationStatusUpdate(applicantId: string, status: string, propertyAddress: string, applicationId: string) {
    return this.createApplicationNotification(
      applicantId,
      'Application Status Update',
      `Your application for ${propertyAddress} has been ${status.toLowerCase()}.`,
      'high',
      `/enhancedtenantdashboard/applications/${applicationId}`,
      { applicationId, status, propertyAddress }
    );
  }

  /**
   * Notify about new viewing request
   */
  static async notifyViewingRequest(landlordId: string, tenantName: string, propertyAddress: string, viewingId: string) {
    return this.createViewingNotification(
      landlordId,
      'New Viewing Request',
      `${tenantName} has requested to view ${propertyAddress}.`,
      'normal',
      `/enhancedlandlorddashboard/viewings/${viewingId}`,
      { viewingId, tenantName, propertyAddress }
    );
  }

  /**
   * Notify about viewing confirmation
   */
  static async notifyViewingConfirmed(tenantId: string, propertyAddress: string, viewingDate: string, viewingId: string) {
    return this.createViewingNotification(
      tenantId,
      'Viewing Confirmed',
      `Your viewing for ${propertyAddress} has been confirmed for ${viewingDate}.`,
      'normal',
      `/enhancedtenantdashboard/viewings/${viewingId}`,
      { viewingId, propertyAddress, viewingDate }
    );
  }

  /**
   * Notify about payment received
   */
  static async notifyPaymentReceived(landlordId: string, amount: number, tenantName: string, propertyAddress: string) {
    return this.createPaymentNotification(
      landlordId,
      'Payment Received',
      `Payment of R${amount.toLocaleString()} received from ${tenantName} for ${propertyAddress}.`,
      'normal',
      '/enhancedlandlorddashboard/payments',
      { amount, tenantName, propertyAddress }
    );
  }

  /**
   * Notify about payment reminder
   */
  static async notifyPaymentReminder(tenantId: string, amount: number, propertyAddress: string, dueDate: string) {
    return this.createPaymentNotification(
      tenantId,
      'Rent Payment Reminder',
      `Rent payment of R${amount.toLocaleString()} for ${propertyAddress} is due on ${dueDate}.`,
      'high',
      '/enhancedtenantdashboard/payments',
      { amount, propertyAddress, dueDate }
    );
  }
}
