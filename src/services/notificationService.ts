// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { CreateNotificationData, NotificationType, NotificationPriority } from '@/types/notification';
import { NotificationUrls } from '@/utils/notificationRoutes';

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
      NotificationUrls.lease(leaseId),
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
      NotificationUrls.lease(leaseId),
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
      NotificationUrls.maintenance(requestId),
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
      NotificationUrls.maintenance(requestId),
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
      NotificationUrls.application(applicationId),
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
      NotificationUrls.application(applicationId),
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
      NotificationUrls.viewing(viewingId, true),
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
      NotificationUrls.viewing(viewingId, false),
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
      NotificationUrls.payment(true),
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
      NotificationUrls.payment(false),
      { amount, propertyAddress, dueDate }
    );
  }

  /**
   * Notify about KYC status updates
   */
  static async notifyKycApproved(userId: string) {
    return this.createSystemNotification(
      userId,
      'ID Verification Approved',
      'Your identity verification has been approved. You can now request property viewings.',
      'normal',
      NotificationUrls.dashboard(false)
    );
  }

  static async notifyKycRejected(userId: string, reason?: string) {
    return this.createSystemNotification(
      userId,
      'ID Verification Requires Attention',
      `Your identity verification needs to be resubmitted. ${reason || 'Please check the requirements and try again.'}`,
      'high',
      NotificationUrls.verifyId()
    );
  }

  /**
   * Notify about inventory updates
   */
  static async notifyInventoryCompleted(landlordId: string, tenantName: string, propertyAddress: string, inventoryId: string) {
    return this.createSystemNotification(
      landlordId,
      'Property Inventory Completed',
      `${tenantName} has completed the inventory for ${propertyAddress}.`,
      'normal',
      NotificationUrls.inventory(inventoryId, true),
      { inventoryId, tenantName, propertyAddress }
    );
  }

  static async notifyInventoryApproved(tenantId: string, propertyAddress: string, inventoryId: string) {
    return this.createSystemNotification(
      tenantId,
      'Inventory Approved',
      `Your property inventory for ${propertyAddress} has been approved by the landlord.`,
      'normal',
      NotificationUrls.inventory(inventoryId, false),
      { inventoryId, propertyAddress }
    );
  }

  /**
   * Notify about offers
   */
  static async notifyOfferReceived(tenantId: string, landlordName: string, propertyAddress: string, offerId: string) {
    return this.createApplicationNotification(
      tenantId,
      'New Rental Offer Received',
      `${landlordName} has sent you an offer for ${propertyAddress}.`,
      'high',
      NotificationUrls.application(offerId),
      { offerId, landlordName, propertyAddress }
    );
  }

  static async notifyOfferAccepted(landlordId: string, tenantName: string, propertyAddress: string, offerId: string) {
    return this.createApplicationNotification(
      landlordId,
      'Offer Accepted',
      `${tenantName} has accepted your offer for ${propertyAddress}.`,
      'high',
      NotificationUrls.application(offerId),
      { offerId, tenantName, propertyAddress }
    );
  }

  static async notifyOfferDeclined(landlordId: string, tenantName: string, propertyAddress: string, offerId: string) {
    return this.createApplicationNotification(
      landlordId,
      'Offer Declined',
      `${tenantName} has declined your offer for ${propertyAddress}.`,
      'normal',
      NotificationUrls.application(offerId),
      { offerId, tenantName, propertyAddress }
    );
  }
}
