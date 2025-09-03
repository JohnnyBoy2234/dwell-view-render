import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell = ({ className }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to action URL if provided
    if (notification.action_url) {
      // Use React Router navigation instead of window.location.href
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  const handleMarkAsUnread = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await markAsUnread(notificationId);
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'lease':
        return '📄';
      case 'maintenance':
        return '🔧';
      case 'application':
        return '📋';
      case 'payment':
        return '💳';
      case 'viewing':
        return '👁️';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'normal':
        return 'text-blue-500';
      case 'low':
        return 'text-gray-500';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted/50 transition-colors duration-200"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 z-50">
          <Card className="backdrop-blur-xl bg-background/95 border border-border shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Notifications
                </CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors duration-200 ${
                        !notification.is_read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium ${
                              !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {notification.title}
                            </h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6 hover:bg-muted"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!notification.is_read ? (
                                  <DropdownMenuItem onClick={(e) => handleMarkAsRead(e, notification.id)}>
                                    <Check className="h-3 w-3 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={(e) => handleMarkAsUnread(e, notification.id)}>
                                    <Check className="h-3 w-3 mr-2" />
                                    Mark as unread
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={(e) => handleDelete(e, notification.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <p className={`text-xs mt-1 ${
                            !notification.is_read ? 'text-foreground/80' : 'text-muted-foreground'
                          }`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs ${getPriorityColor(notification.priority)}`}>
                              {notification.priority.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
