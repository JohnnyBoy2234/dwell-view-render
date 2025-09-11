import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Search, Heart, Send, User, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export function MobileBottomBar() {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();
  const [searchParams] = useSearchParams();
  
  // Hide bottom bar only when in a specific conversation
  const isInConversation = location.pathname === '/messages' && searchParams.get('c');
  
  if (isInConversation) {
    return null;
  }

  const leftNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/properties', icon: Search, label: 'Search' }
  ];

  const rightNavItems = [
    { path: '/messages', icon: Send, label: 'Messages', showBadge: true, authRequired: true },
    { path: '/auth', icon: User, label: user ? 'Dashboard' : 'Sign In' }
  ];

  const renderNavItem = (item: any) => {
    // Skip auth-required items if user is not logged in
    if (item.authRequired && !user) return null;
    
    const IconComponent = item.icon;
    const isActive = location.pathname === item.path || 
      (item.path === '/messages' && location.pathname.startsWith('/messages'));

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative ${
          isActive
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <div className="relative">
          <IconComponent className="h-5 w-5" />
          {item.showBadge && messageUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
            >
              {messageUnread > 9 ? '9+' : messageUnread}
            </Badge>
          )}
        </div>
        <span className="text-xs">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-40 md:hidden">
      <div className="flex items-center justify-around py-2">
        {/* Left navigation items */}
        {leftNavItems.map(renderNavItem)}

        {/* Center plus button */}
        <Link
          to="/list-property"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative"
        >
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center">
              <Plus className="h-5 w-5 text-white" />
            </div>
          </div>
        </Link>

        {/* Right navigation items */}
        {rightNavItems.map(renderNavItem)}
      </div>
    </div>
  );
}