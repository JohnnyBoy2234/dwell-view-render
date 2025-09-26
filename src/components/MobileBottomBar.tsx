import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, Search, Heart, Send, User, Plus, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useNotifications } from '@/hooks/useNotifications';
import { useTenantNotifications } from '@/hooks/useTenantNotifications';
import { useLandlordNotifications } from '@/hooks/useLandlordNotifications';

export function MobileBottomBar() {
  const location = useLocation();
  const { user, isLandlord } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();
  const { unreadCount: notificationUnread } = useNotifications();
  const { unreadCount: tenantUnread } = useTenantNotifications();
  const { unreadCount: landlordUnread } = useLandlordNotifications();
  
  
  const [searchParams] = useSearchParams();
  
  // Hide bottom bar when in a specific conversation or on signing pages
  const isInConversation = location.pathname === '/messages' && searchParams.get('c');
  const isSigningPage = /\/leases\/.+\/sign/.test(location.pathname) || /\/contracts\/.+\/sign/.test(location.pathname) || location.pathname.includes('/sign') || location.pathname.startsWith('/swiftrent-lease/');
  
  // Ensure pages have enough bottom padding when the bar is visible
  useEffect(() => {
    if (isInConversation || isSigningPage) {
      document.body.classList.remove('has-mobile-bottom-bar');
      return;
    }
    document.body.classList.add('has-mobile-bottom-bar');
    return () => {
      document.body.classList.remove('has-mobile-bottom-bar');
    };
  }, [isInConversation, isSigningPage]);
  
  const leftNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/properties', icon: Search, label: 'Find' }
  ];

  // Calculate total notification count
  const totalNotifications = notificationUnread + (isLandlord ? landlordUnread : tenantUnread);
  
  const rightNavItems = [
    { path: '/messages', icon: Send, label: 'Chat', showBadge: true, badgeCount: messageUnread || 0, authRequired: true },
    { path: '/notifications', icon: Bell, label: 'Alerts', showBadge: true, badgeCount: totalNotifications, authRequired: true },
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
                {item.badgeCount > 9 ? '9+' : item.badgeCount}
              </Badge>
            )}
        </div>
        <span className="text-xs text-center">{item.label}</span>
      </Link>
    );
  };

  if (isInConversation || isSigningPage) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#4169e1] backdrop-blur-md border-t border-white/20 z-40 md:hidden">
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
            <Plus className={`h-5 w-5 ${location.pathname === '/list-property' ? 'text-white' : ''}`} />
          </div>
          <span className="text-xs text-center">List</span>
        </Link>

        {rightNavItems.map(renderNavItem)}
      </div>
    </div>
  );
}