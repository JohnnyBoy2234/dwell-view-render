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
  const { unreadCount: notificationUnread } = useNotifications();
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
    { path: '/messages', icon: Send, label: 'Chat', showBadge: true, badgeCount: messageUnread, authRequired: true },
    { path: '/notifications', icon: Bell, label: 'Alerts', showBadge: true, badgeCount: notificationUnread, authRequired: true },
    { path: '/auth', icon: User, label: 'Desk' }
  ];

  const renderNavItem = (item: any) => {
    // Skip auth-required items if user is not logged in
    if (item.authRequired && !user) return null;
    
    const IconComponent = item.icon;
    const isActive = location.pathname === item.path || 
      (item.path === '/messages' && location.pathname.startsWith('/messages')) ||
      (item.path === '/notifications' && location.pathname.startsWith('/notifications'));

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative ${
          isActive
            ? 'text-blue-400 bg-blue-400/10'
            : 'text-gray-300 hover:text-blue-400'
        }`}
      >
        <div className="relative">
          <IconComponent className="h-5 w-5" />
            {item.showBadge && item.badgeCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center bg-red-500 text-white"
              >
                {item.badgeCount > 9 ? '9+' : item.badgeCount}
              </Badge>
            )}
        </div>
        <span className="text-xs">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-md border-t border-slate-600 z-40 md:hidden">
      <div className="flex items-center justify-around py-2">
        {/* Left navigation items */}
        {leftNavItems.map(renderNavItem)}

        {/* Center plus button */}
        <Link
          to="/list-property"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative ${
            location.pathname === '/list-property'
              ? 'text-blue-400 bg-blue-400/10'
              : 'text-gray-300 hover:text-blue-400'
          }`}
        >
          <div className="relative">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-xs">List</span>
        </Link>

        {/* Right navigation items */}
        {rightNavItems.map(renderNavItem)}
      </div>
    </div>
  );
}