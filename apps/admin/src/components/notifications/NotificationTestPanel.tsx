import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { createLeaseNotifications, createMaintenanceNotifications, createApplicationNotifications, createViewingNotifications, createPaymentNotifications, createSystemNotifications } from '@/utils/notificationHelpers';

export const NotificationTestPanel = () => {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTestNotification = async (type: string) => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      switch (type) {
        case 'lease-generated':
          await createLeaseNotifications.leaseGenerated(
            user.id,
            user.id, // Using same user for demo
            '123 Test Street, Cape Town',
            'test-lease-id'
          );
          break;
        case 'lease-signed':
          await createLeaseNotifications.leaseSigned(
            user.id,
            user.id,
            '123 Test Street, Cape Town',
            'test-lease-id',
            'tenant'
          );
          break;
        case 'maintenance-request':
          await createMaintenanceNotifications.newRequest(
            user.id,
            'John Doe',
            '123 Test Street, Cape Town',
            'test-maintenance-id'
          );
          break;
        case 'maintenance-update':
          await createMaintenanceNotifications.statusUpdate(
            user.id,
            'In Progress',
            '123 Test Street, Cape Town',
            'test-maintenance-id'
          );
          break;
        case 'new-application':
          await createApplicationNotifications.newApplication(
            user.id,
            'Jane Smith',
            '123 Test Street, Cape Town',
            'test-application-id'
          );
          break;
        case 'application-update':
          await createApplicationNotifications.statusUpdate(
            user.id,
            'Approved',
            '123 Test Street, Cape Town',
            'test-application-id'
          );
          break;
        case 'viewing-request':
          await createViewingNotifications.newRequest(
            user.id,
            'Bob Johnson',
            '123 Test Street, Cape Town',
            'test-viewing-id'
          );
          break;
        case 'viewing-confirmed':
          await createViewingNotifications.confirmed(
            user.id,
            '123 Test Street, Cape Town',
            'Tomorrow at 2:00 PM',
            'test-viewing-id'
          );
          break;
        case 'payment-received':
          await createPaymentNotifications.received(
            user.id,
            15000,
            'Alice Brown',
            '123 Test Street, Cape Town'
          );
          break;
        case 'payment-reminder':
          await createPaymentNotifications.reminder(
            user.id,
            15000,
            '123 Test Street, Cape Town',
            'December 1, 2024'
          );
          break;
        case 'welcome':
          await createSystemNotifications.welcome(user.id, 'landlord');
          break;
        case 'system-update':
          await createSystemNotifications.systemUpdate(
            user.id,
            'We have added new features to help you manage your properties more efficiently!'
          );
          break;
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Test Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to test notifications.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Notification Test Panel
          <Badge variant="outline">Development</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the buttons below to create test notifications. Check the bell icon in the header to see them appear in real-time.
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('lease-generated')}
            disabled={isCreating}
          >
            Lease Generated
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('lease-signed')}
            disabled={isCreating}
          >
            Lease Signed
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('maintenance-request')}
            disabled={isCreating}
          >
            Maintenance Request
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('maintenance-update')}
            disabled={isCreating}
          >
            Maintenance Update
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('new-application')}
            disabled={isCreating}
          >
            New Application
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('application-update')}
            disabled={isCreating}
          >
            Application Update
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('viewing-request')}
            disabled={isCreating}
          >
            Viewing Request
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('viewing-confirmed')}
            disabled={isCreating}
          >
            Viewing Confirmed
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('payment-received')}
            disabled={isCreating}
          >
            Payment Received
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('payment-reminder')}
            disabled={isCreating}
          >
            Payment Reminder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('welcome')}
            disabled={isCreating}
          >
            Welcome Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateTestNotification('system-update')}
            disabled={isCreating}
          >
            System Update
          </Button>
        </div>
        
        {isCreating && (
          <p className="text-sm text-muted-foreground text-center">
            Creating notification...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
