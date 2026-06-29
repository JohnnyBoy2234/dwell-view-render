import { useState, useRef, useEffect } from 'react';
import {
  Bell, X, CheckCheck, Trash2, MoreVertical, Check,
  MessageCircle, FileText, Calendar, Wrench, Home,
  CreditCard, Package, Tag, Shield, Settings,
} from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@mzanzihomes/ui/components/dropdown-menu';
import { useNotifications } from '@mzanzihomes/supabase/hooks/useNotifications';
import { useTenantNotifications } from '@mzanzihomes/supabase/hooks/useTenantNotifications';
import { useLandlordNotifications } from '@mzanzihomes/supabase/hooks/useLandlordNotifications';
import { Notification } from '@mzanzihomes/common/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { getNotificationTargetUrl } from '@mzanzihomes/ui/utils/notificationRoutes';

// ── Type icon map ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  application: { icon: Home,          bg: 'bg-indigo-100 dark:bg-indigo-900/40', color: 'text-indigo-600 dark:text-indigo-400' },
  maintenance:  { icon: Wrench,        bg: 'bg-orange-100 dark:bg-orange-900/40', color: 'text-orange-600 dark:text-orange-400' },
  payment:      { icon: CreditCard,    bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' },
  viewing:      { icon: Calendar,      bg: 'bg-blue-100 dark:bg-blue-900/40',    color: 'text-blue-600 dark:text-blue-400' },
  lease:        { icon: FileText,      bg: 'bg-violet-100 dark:bg-violet-900/40', color: 'text-violet-600 dark:text-violet-400' },
  message:      { icon: MessageCircle, bg: 'bg-sky-100 dark:bg-sky-900/40',      color: 'text-sky-600 dark:text-sky-400' },
  inventory:    { icon: Package,       bg: 'bg-amber-100 dark:bg-amber-900/40',  color: 'text-amber-600 dark:text-amber-400' },
  offer:        { icon: Tag,           bg: 'bg-pink-100 dark:bg-pink-900/40',    color: 'text-pink-600 dark:text-pink-400' },
  kyc:          { icon: Shield,        bg: 'bg-teal-100 dark:bg-teal-900/40',    color: 'text-teal-600 dark:text-teal-400' },
  system:       { icon: Settings,      bg: 'bg-slate-100 dark:bg-slate-800/60',  color: 'text-slate-600 dark:text-slate-400' },
};

const getTypeConfig = (type?: string) =>
  TYPE_CONFIG[type || ''] ?? { icon: Bell, bg: 'bg-gray-100 dark:bg-gray-800/60', color: 'text-gray-500' };

// ── Props ─────────────────────────────────────────────────────────────────────

interface NotificationBellProps {
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NotificationBell = ({ className }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isLandlord } = useAuth();
  const { notifications, unreadCount: notifUnread, markAsRead, markAsUnread, markAllAsRead, deleteNotification } = useNotifications();
  const { unreadCount: tenantUnread } = useTenantNotifications();
  const { unreadCount: landlordUnread } = useLandlordNotifications();
  const leaseUnread = isLandlord ? landlordUnread : tenantUnread;
  const unreadCount = notifUnread + leaseUnread;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    navigate(getNotificationTargetUrl(notification, isLandlord));
    setIsOpen(false);
  };

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const handleMarkAsUnread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markAsUnread(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={dropdownRef}>
      {/* Bell button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(v => !v); }}
        className="relative p-2 hover:bg-muted/50 transition-colors"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className="rounded-2xl border border-border/50 overflow-hidden"
            style={{
              background: 'rgba(var(--card-rgb, 255,255,255), 0.96)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-muted-foreground">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-[11px] text-primary hover:text-primary hover:bg-primary/10 h-7 px-2.5 gap-1 rounded-full"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 p-0 rounded-full hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground/70">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notification) => {
                    const cfg = getTypeConfig(notification.type);
                    const Icon = cfg.icon;
                    const isUnread = !notification.is_read;

                    return (
                      <div
                        key={notification.id}
                        className={`
                          flex items-start gap-3 px-3 py-3 mx-1 my-0.5 rounded-xl cursor-pointer
                          transition-colors duration-150
                          ${isUnread ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/60'}
                        `}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {/* Icon bubble */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className={`text-[13px] leading-snug ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                              {notification.title || 'Notification'}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isUnread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  {isUnread ? (
                                    <DropdownMenuItem onClick={e => handleMarkAsRead(e, notification.id)}>
                                      <Check className="h-3.5 w-3.5 mr-2" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={e => handleMarkAsUnread(e, notification.id)}>
                                      <Check className="h-3.5 w-3.5 mr-2" />
                                      Mark as unread
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={e => handleDelete(e, notification.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {notification.message && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {notification.created_at
                              ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                              : 'Just now'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border/40 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => { navigate('/notifications'); setIsOpen(false); }}
                  className="w-full text-center text-[12px] text-primary font-medium hover:underline"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
