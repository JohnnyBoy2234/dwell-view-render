import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { useTenantNotifications } from "@/hooks/useTenantNotifications";
import { useLandlordNotifications } from "@/hooks/useLandlordNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  // Use the appropriate notification hook based on user type
  const { notifications: generalNotifications, unreadCount: generalUnread, markAsRead: markGeneralAsRead, markAllAsRead: markAllGeneralAsRead } = useNotifications();
  // Add markAllAsRead functions for tenant/landlord notifications  
  const { notifications: tenantNotifications, unreadCount: tenantUnread, markAsRead: markTenantAsRead, markAllAsRead: markAllTenantAsRead } = useTenantNotifications();
  const { notifications: landlordNotifications, unreadCount: landlordUnread, markAsRead: markLandlordAsRead, markAllAsRead: markAllLandlordAsRead } = useLandlordNotifications();

  if (!user) return null;

  // Calculate total unread count
  const totalUnread = generalUnread + (isLandlord ? landlordUnread : tenantUnread);
  
  console.log('🔔 NotificationBell counts:', {
    generalUnread,
    tenantUnread,
    landlordUnread,
    isLandlord,
    totalUnread
  });
  
  // Combine notifications based on user type
  const allNotifications = [
    ...generalNotifications,
    ...(isLandlord ? landlordNotifications : tenantNotifications)
  ].sort((a, b) => {
    const aDate = 'createdAt' in a ? a.createdAt : a.created_at;
    const bDate = 'createdAt' in b ? b.createdAt : b.created_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if ('is_read' in notification) {
      markGeneralAsRead(notification.id);
    } else if (isLandlord) {
      markLandlordAsRead(notification.id);
    } else {
      markTenantAsRead(notification.id);
    }

    // Navigate to relevant page based on notification type, link URL, action URL, and metadata
    let targetUrl = notification.link_url || notification.action_url;

    // If no direct URL, extract from metadata and build specific URL
    if (!targetUrl && notification.metadata) {
      const { leaseId, requestId, applicationId, viewingId, offerId, inventoryId, propertyId, conversationId } = notification.metadata;
      const dashboardBase = isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';
      
      switch (notification.type) {
        case 'lease':
          targetUrl = leaseId ? `${dashboardBase}/leases/${leaseId}` : `${dashboardBase}/leases`;
          break;
        case 'maintenance':
          targetUrl = requestId ? `${dashboardBase}/maintenance/${requestId}` : `${dashboardBase}/maintenance`;
          break;
        case 'application':
          targetUrl = applicationId ? `${dashboardBase}/applications/${applicationId}` : `${dashboardBase}/applications`;
          break;
        case 'payment':
          targetUrl = `${dashboardBase}/payments`;
          break;
        case 'viewing':
          targetUrl = viewingId ? `${dashboardBase}/viewings/${viewingId}` : `${dashboardBase}/viewings`;
          break;
        case 'inventory':
          targetUrl = inventoryId ? `${dashboardBase}/inventory/${inventoryId}` : `${dashboardBase}/inventory`;
          break;
        case 'offer':
          targetUrl = offerId ? `${dashboardBase}/offers/${offerId}` : `${dashboardBase}/offers`;
          break;
        case 'system':
          if (notification.metadata?.redirect_url) {
            targetUrl = notification.metadata.redirect_url;
          }
          break;
        case 'message':
          targetUrl = conversationId ? `/messages?c=${conversationId}` : '/messages';
          break;
        default:
          if (conversationId) {
            targetUrl = `/messages?c=${conversationId}`;
          } else if (propertyId) {
            targetUrl = `/properties/${propertyId}`;
          } else {
            targetUrl = dashboardBase;
          }
      }
    }

    // Fallback: Handle legacy tenancyId field
    if (!targetUrl && (notification.tenancyId || notification.id)) {
      const leaseId = notification.tenancyId || notification.id;
      const dashboardBase = isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';
      if (isLandlord) {
        if (notification.type === 'lease_signed_by_tenant' || notification.type === 'lease_ready') {
          targetUrl = `${dashboardBase}/leases/${leaseId}`;
        } else {
          targetUrl = `${dashboardBase}/leases`;
        }
      } else {
        if (notification.type === 'lease_ready' || notification.type === 'lease_update') {
          targetUrl = `${dashboardBase}/leases/${leaseId}`;
        } else {
          targetUrl = `${dashboardBase}/leases`;
        }
      }
    }

    // Final fallback: Default navigation based on user type
    if (!targetUrl) {
      const dashboardBase = isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';
      switch (notification.type) {
        case 'message':
          targetUrl = '/messages';
          break;
        case 'lease':
          targetUrl = `${dashboardBase}/leases`;
          break;
        case 'maintenance':
          targetUrl = `${dashboardBase}/maintenance`;
          break;
        case 'payment':
          targetUrl = `${dashboardBase}/payments`;
          break;
        case 'viewing':
          targetUrl = `${dashboardBase}/viewings`;
          break;
        case 'application':
          targetUrl = `${dashboardBase}/applications`;
          break;
        default:
          targetUrl = dashboardBase;
      }
    }
    
    if (targetUrl) {
      navigate(targetUrl);
    }
    
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto bg-background border-border z-50" align="end">
        <DropdownMenuLabel className="px-4 py-2 font-semibold text-foreground border-b">
          Notifications {totalUnread > 0 && `(${totalUnread} unread)`}
        </DropdownMenuLabel>
        
        {allNotifications.length === 0 ? (
          <DropdownMenuItem className="px-4 py-6 text-center text-muted-foreground">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Loading notifications...
            </div>
          </DropdownMenuItem>
        ) : (
          allNotifications.slice(0, 10).map((notification, index) => {
            const isUnread = 'is_read' in notification ? !notification.is_read : !notification.isRead;
            const title = 'title' in notification ? notification.title : notification.message;
            const message = notification.message;
            const notifDate = 'createdAt' in notification ? notification.createdAt : notification.created_at;
            const time = new Date(notifDate).toLocaleDateString();
            
            // Get notification type for styling
            const notificationType = notification.type || 'general';
            const isHighPriority = (notification as any).priority === 'high' || (notification as any).priority === 'urgent';
            
            return (
              <DropdownMenuItem
                key={notification.id}
                className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  isUnread 
                    ? `bg-primary/5 border-l-2 ${isHighPriority ? 'border-l-destructive' : 'border-l-primary'}` 
                    : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-start">
                    <span className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                      {title}
                    </span>
                    <div className="flex items-center gap-1">
                      {isHighPriority && (
                        <div className="w-1.5 h-1.5 bg-destructive rounded-full"></div>
                      )}
                      {isUnread && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {message}
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {time}
                    </span>
                    {notificationType !== 'general' && (
                      <span className="text-xs px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground capitalize">
                        {notificationType}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
        
        {allNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="px-4 py-2 text-center text-primary cursor-pointer"
              onClick={async () => {
                console.log('🔔 Marking ALL notifications as read - General:', generalUnread, 'Tenant:', tenantUnread, 'Landlord:', landlordUnread);
                try {
                  // Mark general notifications as read
                  await markAllGeneralAsRead();
                  
                  // Mark tenant/landlord specific notifications as read
                  if (isLandlord) {
                    await markAllLandlordAsRead();
                  } else {
                    await markAllTenantAsRead();
                  }
                  
                  console.log('🔔 All notifications marked as read');
                } catch (error) {
                  console.error('Error marking all as read:', error);
                }
                setOpen(false);
              }}
            >
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
        
        {allNotifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="px-4 py-2 text-center text-primary cursor-pointer"
              onClick={() => {
                navigate(isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard');
                setOpen(false);
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}