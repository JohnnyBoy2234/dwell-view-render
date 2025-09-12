import * as React from 'react';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { useTenantNotifications } from '@/hooks/useTenantNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

export function TenantDashboardHeader() {
  const { notifications } = useTenantNotifications();
  const { unreadCount } = useUnreadMessages();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const totalUnread = notifications.filter(n => !n.isRead).length + unreadCount;

  return (
    <header className="bg-gradient-to-r from-ocean-blue to-ocean-blue-dark text-white shadow-soft sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Tenant Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="relative text-white hover:bg-white/10"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-5 w-5" />
                {totalUnread > 0 && (
                  <NotificationBadge 
                    count={totalUnread} 
                    className="bg-earth-warm text-white border-white"
                  />
                )}
              </Button>
            </div>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-white hover:bg-white/10"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/enhancedtenantdashboard')}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/messages')}>
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/properties')}>
                  Browse Properties
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}