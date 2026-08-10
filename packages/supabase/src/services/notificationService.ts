// @ts-nocheck
import { supabase } from '../client';
import { CreateNotificationData, NotificationType, NotificationPriority } from '@mzanzihomes/common/types/notification';
import { NotificationUrls } from '@mzanzihomes/ui/utils/notificationRoutes';

export class NotificationService {
  /**
   * Create a notification for a specific user
   */
  // The notifications table only has: user_id, message, link_url, type,
  // metadata. Older callers pass title / priority / action_url, which don't
  // exist as columns and made inserts fail ("could not find 'action_url'…").
  // Map any incoming shape to the real columns here so every caller is fixed.
  private static toRow(data: CreateNotificationData) {
    const meta: Record<string, any> = { ...(data.metadata ?? {}) };
    if ((data as any).title) meta.title = (data as any).title;
    if ((data as any).priority) meta.priority = (data as any).priority;
    return {
      user_id: data.user_id,
      message: data.message,
      link_url: (data as any).action_url ?? (data as any).link_url ?? null,
      type: data.type ?? 'general',
      metadata: Object.keys(meta).length ? meta : null,
    };
  }

  static async createNotification(data: CreateNotificationData) {
    // Route through the SECURITY DEFINER `create_notification` RPC instead of a
    // direct insert. A direct `.insert().select()` runs INSERT ... RETURNING,
    // and the RETURNING is re-checked against the SELECT policy
    // (user_id = auth.uid()). When one user creates a notification for another
    // (e.g. a landlord approving a tenant's request), that read fails with
    // "new row violates row-level security policy". The RPC bypasses RLS and
    // returns void, so cross-user notifications work.
    const row = this.toRow(data);
    try {
      const { error } = await supabase.rpc('create_notification', {
        _user_id: row.user_id,
        _message: row.message,
        _link_url: row.link_url,
        _type: row.type,
        _metadata: row.metadata ?? {},
      });

      if (error) throw error;
      return row;
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
      return await Promise.all(
        notifications.map((n) => this.createNotification(n))
      );
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
