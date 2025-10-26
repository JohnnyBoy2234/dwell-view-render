import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Settings, LogOut, LayoutDashboard, MessageSquare } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { NAVBAR_CONTENT, NAVBAR_STYLES } from '@/constants/navbarConstants';

interface UserDropdownProps {
  user: {
    email?: string;
  };
  messageUnread: number;
  isLandlord: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
}

/**
 * User dropdown menu component
 * Displays user options including dashboard, messages, admin panel, and sign out
 */
export function UserDropdown({ 
  user, 
  messageUnread, 
  isLandlord, 
  isAdmin, 
  onSignOut 
}: UserDropdownProps) {
  const navigate = useNavigate();
  const displayName = user.email?.split('@')[0] || 'User';

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/settings');
  };

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(isLandlord ? '/landlord/dashboard' : '/tenant/dashboard');
  };

  const handleMessagesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/messages');
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Desktop Buttons - Only show on larger screens */}
      <div className="hidden md:flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDashboardClick}
          className="p-2 h-9 w-9 rounded-full"
          title="Dashboard"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMessagesClick}
          className="p-2 h-9 w-9 rounded-full relative"
          title="Messages"
        >
          <MessageSquare className="h-5 w-5" />
          {messageUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {messageUnread}
            </span>
          )}
        </Button>
      </div>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`${NAVBAR_STYLES.USER_BUTTON} p-0 h-9 w-9 rounded-full`}
          >
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-56 p-2 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800"
          align="end"
        >
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          
          <DropdownMenuSeparator className="my-1" />
          
          <DropdownMenuItem 
            onClick={handleDashboardClick}
            className="md:hidden px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleMessagesClick}
            className="md:hidden px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 relative"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Messages</span>
            {messageUnread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {messageUnread}
              </span>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleSettingsClick}
            className="px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-1" />
          
          <DropdownMenuItem 
            onClick={onSignOut}
            className="px-3 py-2 text-sm rounded-md cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}