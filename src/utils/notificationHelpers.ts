import { NotificationService } from '@/services/notificationService';

/**
 * Helper functions to create notifications for common events
 */

// Lease-related notifications
export const createLeaseNotifications = {
  async leaseGenerated(landlordId: string, tenantId: string, propertyAddress: string, leaseId: string) {
    // Notify landlord
    await NotificationService.createLeaseNotification(
      landlordId,
      'Lease Generated',
      `A new lease has been generated for ${propertyAddress}.`,
      'normal',
      `/enhancedlandlorddashboard/leases/${leaseId}`
    );

    // Notify tenant
    await NotificationService.createLeaseNotification(
      tenantId,
      'Lease Ready for Review',
      `A lease has been prepared for ${propertyAddress}. Please review and sign.`,
      'high',
      `/enhancedtenantdashboard/leases/${leaseId}`
    );
  },

  async leaseSigned(landlordId: string, tenantId: string, propertyAddress: string, leaseId: string, signerRole: 'landlord' | 'tenant') {
    if (signerRole === 'tenant') {
      // Tenant signed, notify landlord
      await NotificationService.notifyLeaseSigned(landlordId, 'Tenant', propertyAddress, leaseId);
    } else {
      // Landlord signed, notify tenant
      await NotificationService.notifyLeaseReadyForSignature(tenantId, 'Landlord', propertyAddress, leaseId);
    }
  }
};

// Maintenance-related notifications
export const createMaintenanceNotifications = {
  async newRequest(landlordId: string, tenantName: string, propertyAddress: string, requestId: string) {
    await NotificationService.notifyMaintenanceRequest(landlordId, tenantName, propertyAddress, requestId);
  },

  async statusUpdate(tenantId: string, status: string, propertyAddress: string, requestId: string) {
    await NotificationService.notifyMaintenanceStatusUpdate(tenantId, status, propertyAddress, requestId);
  }
};

// Application-related notifications
export const createApplicationNotifications = {
  async newApplication(landlordId: string, applicantName: string, propertyAddress: string, applicationId: string) {
    await NotificationService.notifyNewApplication(landlordId, applicantName, propertyAddress, applicationId);
  },

  async statusUpdate(applicantId: string, status: string, propertyAddress: string, applicationId: string) {
    await NotificationService.notifyApplicationStatusUpdate(applicantId, status, propertyAddress, applicationId);
  }
};

// Viewing-related notifications
export const createViewingNotifications = {
  async newRequest(landlordId: string, tenantName: string, propertyAddress: string, viewingId: string) {
    await NotificationService.notifyViewingRequest(landlordId, tenantName, propertyAddress, viewingId);
  },

  async confirmed(tenantId: string, propertyAddress: string, viewingDate: string, viewingId: string) {
    await NotificationService.notifyViewingConfirmed(tenantId, propertyAddress, viewingDate, viewingId);
  }
};

// Payment-related notifications
export const createPaymentNotifications = {
  async received(landlordId: string, amount: number, tenantName: string, propertyAddress: string) {
    await NotificationService.notifyPaymentReceived(landlordId, amount, tenantName, propertyAddress);
  },

  async reminder(tenantId: string, amount: number, propertyAddress: string, dueDate: string) {
    await NotificationService.notifyPaymentReminder(tenantId, amount, propertyAddress, dueDate);
  }
};

// System notifications
export const createSystemNotifications = {
  async welcome(userId: string, userType: 'landlord' | 'tenant') {
    await NotificationService.createSystemNotification(
      userId,
      'Welcome to SwiftRent!',
      `Welcome to SwiftRent! Get started by ${userType === 'landlord' ? 'listing your first property' : 'browsing available properties'}.`,
      'normal',
      userType === 'landlord' ? '/list-property' : '/properties'
    );
  },

  async systemUpdate(userId: string, message: string) {
    await NotificationService.createSystemNotification(
      userId,
      'System Update',
      message,
      'normal'
    );
  }
};
