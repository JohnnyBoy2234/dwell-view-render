import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@mzanzihomes/ui/components/button';
import {
  Bell,
  MessageCircle,
  FileText,
  Calendar,
  Wrench,
  Home,
  CheckCheck,
  Package,
  CreditCard,
  Shield,
  Tag,
  Settings,
} from 'lucide-react';
import { getNotificationTargetUrl } from '@/utils/notificationRoutes';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Notification } from '@mzanzihomes/common/types/notification';

// ── Type config ───────────────────────────────────────────────────────────────

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

const getTypeConfig = (type?: string | null) =>
  TYPE_CONFIG[type ?? ''] ?? { icon: Bell, bg: 'bg-gray-100 dark:bg-gray-800/60', color: 'text-gray-500' };

// ── Date grouping ─────────────────────────────────────────────────────────────

function getDateGroup(ts?: string | null): string {
  if (!ts) return 'Earlier';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Earlier';
    if (isToday(d))     return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    // Check if within last 7 days manually (avoids isThisWeek locale issues)
    const now = new Date();
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) return 'This Week';
    return 'Earlier';
  } catch {
    return 'Earlier';
  }
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'];

// ── Notification row ──────────────────────────────────────────────────────────

interface RowProps {
  notification: Notification;
  index: number;
  onPress: (n: Notification) => void;
}

function NotificationRow({ notification, index, onPress }: RowProps) {
  const cfg = getTypeConfig(notification.type);
  const Icon = cfg.icon;
  const isUnread = !notification.is_read;

  const timeText = (() => {
    try {
      if (!notification.created_at) return '';
      const d = new Date(notification.created_at);
      if (isNaN(d.getTime())) return '';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <button
      type="button"
      className="w-full text-left animate-conversation-entry"
      style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
      onClick={() => onPress(notification)}
    >
      <div
        className={`
          flex items-start gap-4 px-4 py-4 rounded-2xl transition-colors duration-150
          active:scale-[0.98] active:transition-transform
          ${isUnread
            ? 'bg-primary/5 hover:bg-primary/8 dark:bg-primary/10'
            : 'hover:bg-muted/60'}
        `}
      >
        {/* Icon bubble */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
          <Icon className={`w-6 h-6 ${cfg.color}`} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[15px] leading-snug ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
              {notification.title || 'Notification'}
            </p>
            {isUnread && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          {notification.message ? (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {notification.message}
            </p>
          ) : null}
          {timeText ? (
            <p className="text-xs text-muted-foreground/70 mt-1.5">{timeText}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Notifications() {
  const { isLandlord } = useAuth();
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayed = useMemo(
    () => filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications,
    [notifications, filter]
  );

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  const grouped = useMemo(() => {
    const map: Record<string, Notification[]> = {};
    displayed.forEach(n => {
      const g = getDateGroup(n.created_at);
      if (!map[g]) map[g] = [];
      map[g].push(n);
    });
    return map;
  }, [displayed]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      const url = getNotificationTargetUrl(notification, isLandlord);
      navigate(url);
    } catch (err) {
      console.error('Notification click error:', err);
    }
  };

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div
          className="sticky top-0 z-10 px-4 border-b border-border/40"
          style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(20px)' }}
        >
          <div className="max-w-2xl mx-auto py-4">
            <div className="h-7 w-16 bg-muted rounded animate-pulse mb-1.5" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-4 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = displayed.length === 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky glass header */}
      <div
        className="sticky top-0 z-10 border-b border-border/40"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Alerts</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={markAllAsRead}
                className="text-sm text-primary hover:text-primary hover:bg-primary/10 rounded-full h-9 px-3 gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-muted/60 p-1 rounded-xl w-fit">
            {(['all', 'unread'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`
                  px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${filter === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                {tab === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-conversation-entry">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-5">
              <Bell className="w-9 h-9 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-semibold text-foreground/80 mb-1.5">
              {filter === 'unread' ? 'No unread alerts' : 'No alerts yet'}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {filter === 'unread'
                ? "You've read everything — great job staying on top of things."
                : "You'll be notified here about applications, payments, maintenance, and more."}
            </p>
            {filter === 'unread' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-5 text-sm text-primary font-semibold"
              >
                View all alerts
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.filter(g => (grouped[g]?.length ?? 0) > 0).map(group => {
              const items = grouped[group] ?? [];
              const groupOffset = GROUP_ORDER
                .slice(0, GROUP_ORDER.indexOf(group))
                .reduce((acc, g) => acc + (grouped[g]?.length ?? 0), 0);

              return (
                <section key={group}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                    {group}
                  </p>
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
                    {items.map((n, i) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        index={groupOffset + i}
                        onPress={handleNotificationClick}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
