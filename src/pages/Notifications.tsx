import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  MessageCircle, 
  FileText, 
  Calendar, 
  DollarSign, 
  Wrench, 
  Home,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface NotificationItem {
  id: string;
  type: 'message' | 'lease' | 'maintenance' | 'payment' | 'viewing' | 'application' | 'general';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const { unreadCount: messageUnread } = useUnreadMessages();

  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchAllNotifications();
  }, [user, navigate, messageUnread, notifications]);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      
      // Combine different types of notifications
      const combinedNotifications: NotificationItem[] = [];

      // Add general notifications from database
      if (notifications && notifications.length > 0) {
        console.log('🔔 Processing notifications in Notifications page:', notifications.length);
        notifications.forEach(notification => {
          combinedNotifications.push({
            id: notification.id,
            type: 'general',
            title: notification.title || 'Notification',
            message: notification.message || '',
            timestamp: notification.created_at,
            isRead: notification.is_read || false,
            actionUrl: notification.action_url,
            priority: (['urgent', 'normal'].includes(notification.priority) ? 'high' : notification.priority) as 'low' | 'medium' | 'high' || 'medium'
          });
        });
      } else {
        console.log('🔔 No notifications found in Notifications page');
      }

      // Add message notifications if there are unread messages
      if (messageUnread > 0) {
        combinedNotifications.push({
          id: 'messages',
          type: 'message',
          title: 'New Messages',
          message: `You have ${messageUnread} unread message${messageUnread > 1 ? 's' : ''}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          actionUrl: '/messages',
          priority: 'high'
        });
      }

      // Lease notifications removed

      // Sort by timestamp (newest first)
      combinedNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAllNotifications(combinedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `h-5 w-5 ${
      priority === 'high' ? 'text-red-500' : 
      priority === 'medium' ? 'text-yellow-500' : 
      'text-blue-500'
    }`;

    switch (type) {
      case 'message':
        return <MessageCircle className={iconClass} />;
      case 'lease':
        return <FileText className={iconClass} />;
      case 'maintenance':
        return <Wrench className={iconClass} />;
      case 'payment':
        return <DollarSign className={iconClass} />;
      case 'viewing':
        return <Calendar className={iconClass} />;
      case 'application':
        return <Home className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    // Mark as read (only for real notifications, not synthetic ones)
    if (!notification.isRead && notification.id !== 'messages' && notification.id !== 'leases') {
      try {
        await markAsRead(notification.id);
        // Update local state immediately
        setAllNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, isRead: true }
              : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type and action URL
    let targetUrl = notification.actionUrl;

    // If no action URL, determine based on notification type
    if (!targetUrl) {
      switch (notification.type) {
        case 'message':
          targetUrl = '/messages';
          break;
        case 'lease':
          targetUrl = '/enhancedtenantdashboard/leases';
          break;
        case 'maintenance':
          targetUrl = '/enhancedtenantdashboard/maintenance';
          break;
        case 'payment':
          targetUrl = '/enhancedtenantdashboard/payments';
          break;
        case 'viewing':
          targetUrl = '/enhancedtenantdashboard/viewings';
          break;
        case 'application':
          targetUrl = '/enhancedtenantdashboard/applications';
          break;
        default:
          targetUrl = '/enhancedtenantdashboard';
      }
    }

    // Navigate to the target URL
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      console.log('🔔 Notifications page: Marking all as read');
      await markAllAsRead();
      // Update local state immediately
      setAllNotifications(prev => {
        const updated = prev.map(n => ({ ...n, isRead: true }));
        console.log('🔔 Notifications page: Local state updated,', updated.length, 'notifications marked as read');
        return updated;
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const unreadCount = allNotifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Alerts</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {!loading && allNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground text-center">
                You're all caught up! We'll notify you when there's something new.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {allNotifications.map((notification, index) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:shadow-md active:scale-[0.98] ${
                    !notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-semibold ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(notification.priority)}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  {index < allNotifications.length - 1 && <Separator />}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
