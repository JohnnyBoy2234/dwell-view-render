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
  const { notifications: tenantNotifications, unreadCount: tenantUnread, markAsRead: markTenantAsRead } = useTenantNotifications();
  const { notifications: landlordNotifications, unreadCount: landlordUnread, markAsRead: markLandlordAsRead } = useLandlordNotifications();

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

    // Navigate to relevant page based on notification type
    if (notification.link_url) {
      navigate(notification.link_url);
    } else if (notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.tenancyId || notification.id) {
      // Handle lease-related notifications
      const leaseId = notification.tenancyId || notification.id;
      if (isLandlord) {
        if (notification.type === 'lease_signed_by_tenant' || notification.type === 'lease_ready') {
          navigate(`/enhancedlandlorddashboard?tab=leases&lease=${leaseId}`);
        } else {
          navigate('/enhancedlandlorddashboard');
        }
      } else {
        if (notification.type === 'lease_ready' || notification.type === 'lease_update') {
          navigate(`/enhancedtenantdashboard?tab=leases&lease=${leaseId}`);
        } else {
          navigate('/enhancedtenantdashboard');
        }
      }
    } else {
      // Default navigation based on user type
      navigate(isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard');
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
            No notifications yet
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
                console.log('🔔 Marking all notifications as read');
                try {
                  await markAllGeneralAsRead();
                  if (isLandlord) {
                    // Mark landlord notifications as read
                    for (const notification of landlordNotifications) {
                      await markLandlordAsRead(notification.id);
                    }
                  } else {
                    // Mark tenant notifications as read
                    for (const notification of tenantNotifications) {
                      await markTenantAsRead(notification.id);
                    }
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