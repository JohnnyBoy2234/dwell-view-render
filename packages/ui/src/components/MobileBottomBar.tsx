import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Home, Search, Bell, Building, Plus, MessageSquare } from 'lucide-react';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { useNotifications } from '@mzanzihomes/supabase/hooks/useNotifications';
import { useTenantNotifications } from '@mzanzihomes/supabase/hooks/useTenantNotifications';
import { useLandlordNotifications } from '@mzanzihomes/supabase/hooks/useLandlordNotifications';
import { cn } from '@mzanzihomes/common/lib/utils';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
    location.pathname.startsWith('/MzanziHomes-lease/');
  const isJoinPage = location.pathname.startsWith('/join');

  // Tenants no longer use a bottom nav — every feature lives on the Home hub,
  // and notifications surface as tile badges. Only the landlord app shows it.
  const hidden = isInConversation || isSigningPage || isJoinPage || !isLandlord;

  useEffect(() => {
    if (hidden) {
      document.body.classList.remove('has-mobile-bottom-bar');
      return;
    }
    document.body.classList.add('has-mobile-bottom-bar');
    return () => {
      document.body.classList.remove('has-mobile-bottom-bar');
    };
  }, [hidden]);

  const totalNotifications = notificationUnread + (isLandlord ? landlordUnread : tenantUnread);

  const getDeskRoute = () => {
    if (!user) return '/auth';
    return isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';
  };

  const navItems: NavItem[] = isLandlord
    ? [
        { path: getDeskRoute(), icon: Building, label: 'Dashboard' },
        { path: '/properties', icon: Search, label: 'Find' },
        { path: '/listing-type', icon: Plus, label: 'List' },
        { path: '/messages', icon: MessageSquare, label: 'Chat', badge: messageUnread || 0 },
        { path: '/notifications', icon: Bell, label: 'Alerts', badge: totalNotifications },
      ]
    : [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/properties', icon: Search, label: 'Find' },
        { path: '/messages', icon: MessageSquare, label: 'Chat', badge: messageUnread || 0 },
        { path: '/notifications', icon: Bell, label: 'Alerts', badge: totalNotifications },
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

  if (hidden) return null;

  return (
    // Docked iOS-style tab bar — light frosted glass that blends with the
    // app's light pages (hsl(214 60% 97%)) instead of floating over them.
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid hsl(214 60% 90%)',
        boxShadow: '0 -8px 24px rgba(37, 99, 235, 0.06)',
      }}
    >
      <div>
        <div className="relative flex items-stretch h-[60px]">
          {/* Sliding pill indicator */}
          {activeIndex >= 0 && (
            <div
              ref={pillRef}
              className="absolute top-1.5 bottom-1.5 rounded-xl pointer-events-none"
              style={{
                left: `calc(${activeIndex * pillWidth}% + 5px)`,
                width: `calc(${pillWidth}% - 10px)`,
                background: 'hsl(214 100% 59% / 0.10)',
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
                className="relative flex flex-col items-center justify-center gap-[3px] flex-1 py-1.5 select-none transition-colors duration-150"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Icon + badge */}
                <div className="relative flex items-center justify-center">
                  <IconComponent
                    className={cn(
                      'h-[22px] w-[22px] transition-all duration-200',
                      active ? 'scale-110' : ''
                    )}
                    style={{ color: active ? 'hsl(214 100% 50%)' : 'hsl(215 16% 57%)' }}
                  />
                  {hasBadge && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-[3px] rounded-full text-[9px] font-bold bg-red-500 text-white flex items-center justify-center leading-none animate-badge-pop"
                      style={{ boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9)' }}
                    >
                      {(item.badge ?? 0) > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className="text-[10px] font-semibold tracking-tight transition-all duration-200"
                  style={{ color: active ? 'hsl(214 100% 50%)' : 'hsl(215 16% 57%)' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
