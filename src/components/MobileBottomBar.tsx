import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Search, Heart, Send, User, Plus, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useNotifications } from '@/hooks/useNotifications';

export function MobileBottomBar() {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();
  const { unreadCount: notificationUnread, notifications, markAllAsRead } = useNotifications();
  
  // Debug: Always log the values to see what's happening
  console.log('MobileBottomBar - All values:', {
    messageUnread,
    notificationUnread,
    totalNotifications: notifications?.length,
    unreadNotifications: notifications?.filter(n => !n.is_read)?.length,
    notifications: notifications?.map(n => ({ id: n.id, is_read: n.is_read, title: n.title }))
  });

  // If there are 9+ notifications, let's see what they are
  if (notifications && notifications.length >= 9) {
    console.log('Found 9+ notifications, details:', notifications.map(n => ({
      id: n.id,
      title: n.title,
      is_read: n.is_read,
      created_at: n.created_at
    })));
  }

  // Temporary function to clear all notifications
  const clearAllNotifications = async () => {
    try {
      await markAllAsRead();
      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };
  
  const [searchParams] = useSearchParams();
  
  // Hide bottom bar only when in a specific conversation
  const isInConversation = location.pathname === '/messages' && searchParams.get('c');
  
  if (isInConversation) {
    return null;
  }

  const leftNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/properties', icon: Search, label: 'Find' }
  ];

  const rightNavItems = [
    { path: '/messages', icon: Send, label: 'Chat', showBadge: true, badgeCount: messageUnread || 0, authRequired: true },
    { path: '/notifications', icon: Bell, label: 'Alerts', showBadge: true, badgeCount: notificationUnread || 0, authRequired: true },
    { path: '/auth', icon: User, label: 'Desk' }
  ];

  const renderNavItem = (item: any) => {
    // Skip auth-required items if user is not logged in
    if (item.authRequired && !user) return null;
    
    const IconComponent = item.icon;
    const isActive = location.pathname === item.path || 
      (item.path === '/messages' && location.pathname.startsWith('/messages')) ||
      (item.path === '/notifications' && location.pathname.startsWith('/notifications')) ||
      (item.path === '/auth' && (location.pathname.startsWith('/auth') || 
        location.pathname.startsWith('/enhancedlandlorddashboard') || 
        location.pathname.startsWith('/enhancedtenantdashboard') ||
        location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/tenant-dashboard')));

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors relative min-w-0 flex-1 ${
          isActive
            ? 'text-white bg-black/20'
            : 'text-white/80 hover:text-white'
        }`}
      >
        <div className="relative">
          <IconComponent className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
            {item.showBadge && item.badgeCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center bg-red-500 text-white"
              >
                {(() => {
                  console.log(`Rendering badge for ${item.label}:`, {
                    badgeCount: item.badgeCount,
                    showBadge: item.showBadge,
                    condition: item.showBadge && item.badgeCount > 0
                  });
                  return item.badgeCount > 9 ? '9+' : item.badgeCount;
                })()}
              </Badge>
            )}
        </div>
        <span className="text-xs text-center">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary/95 backdrop-blur-md border-t border-primary/20 z-40 md:hidden">
      {/* Temporary debug button */}
      {notificationUnread > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
          <button onClick={clearAllNotifications} className="underline">
            Clear {notificationUnread} notifications
          </button>
        </div>
      )}
      
      <div className="flex items-center justify-between px-2 py-2">
        {/* All navigation items with consistent spacing */}
        {leftNavItems.map(renderNavItem)}
        
        <Link
          to="/list-property"
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors relative min-w-0 flex-1 ${
            location.pathname === '/list-property'
              ? 'text-white bg-black/20'
              : 'text-white/80 hover:text-white'
          }`}
        >
          <div className="relative">
            <div className="w-8 h-8 bg-primary/95 border border-white/30 rounded-lg flex items-center justify-center">
              <Plus className={`h-4 w-4 ${
                location.pathname === '/list-property' ? 'text-white' : 'text-white'
              }`} />
            </div>
          </div>
          <span className="text-xs text-center">List</span>
        </Link>

        {rightNavItems.map(renderNavItem)}
      </div>
    </div>
  );
}