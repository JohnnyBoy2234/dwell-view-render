import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Home, Search, Bell, Building, Plus, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useNotifications } from '@/hooks/useNotifications';
import { useTenantNotifications } from '@/hooks/useTenantNotifications';
import { useLandlordNotifications } from '@/hooks/useLandlordNotifications';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

export function MobileBottomBar() {
  const location = useLocation();
  const { user, isLandlord } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();
  const { unreadCount: notificationUnread } = useNotifications();
  const { unreadCount: tenantUnread } = useTenantNotifications();
  const { unreadCount: landlordUnread } = useLandlordNotifications();
  const pillRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();

  const isInConversation = location.pathname === '/messages' && searchParams.get('c');
  const isSigningPage =
    /\/leases\/.+\/sign/.test(location.pathname) ||
    /\/contracts\/.+\/sign/.test(location.pathname) ||
    location.pathname.includes('/sign') ||
    location.pathname.startsWith('/RentLekker-lease/');

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

  const totalNotifications = notificationUnread + (isLandlord ? landlordUnread : tenantUnread);

  const getDeskRoute = () => {
    if (!user) return '/auth';
    return isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';
  };

  const navItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/properties', icon: Search, label: 'Find' },
    ...(isLandlord ? [{ path: '/listing-type', icon: Plus, label: 'List' }] : []),
    { path: '/messages', icon: MessageSquare, label: 'Chat', badge: messageUnread || 0 },
    { path: '/notifications', icon: Bell, label: 'Alerts', badge: totalNotifications },
    { path: getDeskRoute(), icon: Building, label: isLandlord ? 'Manage' : 'My Home' },
  ];

  const isItemActive = (item: NavItem, index: number) => {
    const p = location.pathname;
    if (item.path === '/') return p === '/';
    if (item.path === getDeskRoute()) {
      return (
        p.startsWith('/enhancedlandlorddashboard') ||
        p.startsWith('/enhancedtenantdashboard') ||
        p.startsWith('/dashboard') ||
        p.startsWith('/tenant-dashboard') ||
        p.startsWith('/auth')
      );
    }
    if (item.path === '/messages') return p.startsWith('/messages');
    if (item.path === '/notifications') return p.startsWith('/notifications');
    return p === item.path || p.startsWith(item.path + '/');
  };

  const activeIndex = navItems.findIndex(isItemActive);
  const pillWidth = 100 / navItems.length;

  if (isInConversation || isSigningPage) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="mx-2.5 mb-2.5 overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: 'rgba(8, 10, 20, 0.82)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        <div className="relative flex items-stretch h-[60px]">
          {/* Sliding pill indicator */}
          {activeIndex >= 0 && (
            <div
              ref={pillRef}
              className="absolute top-1.5 bottom-1.5 rounded-xl pointer-events-none"
              style={{
                left: `calc(${activeIndex * pillWidth}% + 5px)`,
                width: `calc(${pillWidth}% - 10px)`,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'left 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
                willChange: 'left',
              }}
            />
          )}

          {/* Nav items */}
          {navItems.map((item, index) => {
            const IconComponent = item.icon;
            const active = isItemActive(item, index);
            const hasBadge = (item.badge ?? 0) > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-[3px] flex-1 py-1.5 select-none',
                  'transition-opacity duration-150',
                  active ? 'opacity-100' : 'opacity-50 hover:opacity-75 active:opacity-90'
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Icon + badge */}
                <div className="relative flex items-center justify-center">
                  <IconComponent
                    className={cn(
                      'h-[22px] w-[22px] transition-all duration-200',
                      active ? 'text-white scale-110' : 'text-white/80'
                    )}
                  />
                  {hasBadge && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-[3px] rounded-full text-[9px] font-bold bg-red-500 text-white flex items-center justify-center leading-none animate-badge-pop"
                      style={{ boxShadow: '0 0 0 1.5px rgba(8,10,20,0.82)' }}
                    >
                      {(item.badge ?? 0) > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[10px] font-semibold tracking-tight transition-all duration-200',
                    active ? 'text-white' : 'text-white/50'
                  )}
                >
                  {item.label}
                </span>

                {/* Active dot */}
                {active && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-white animate-badge-pop"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
