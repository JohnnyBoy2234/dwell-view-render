import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LayoutDashboard, MessageCircle, Shield, LogOut } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { NAVBAR_CONTENT, NAVBAR_ROUTES, NAVBAR_STYLES } from '@/constants/navbarConstants';

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
  const displayName = user.email?.split('@')[0] || 'User';
  const dashboardRoute = isLandlord 
    ? NAVBAR_ROUTES.LANDLORD_DASHBOARD 
    : NAVBAR_ROUTES.TENANT_DASHBOARD;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={NAVBAR_STYLES.USER_BUTTON}
        >
          <User className={NAVBAR_STYLES.USER_ICON} />
          {displayName}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className={NAVBAR_STYLES.DROPDOWN_CONTENT} 
        align="end"
      >
        <DropdownMenuItem asChild>
          <Link to={dashboardRoute} className="cursor-pointer">
            <LayoutDashboard className={NAVBAR_STYLES.DROPDOWN_ICON} />
            {NAVBAR_CONTENT.DASHBOARD_LABEL}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to={NAVBAR_ROUTES.MESSAGES} className="cursor-pointer">
            <MessageCircle className={NAVBAR_STYLES.DROPDOWN_ICON} />
            {NAVBAR_CONTENT.MESSAGES_LABEL}
            {messageUnread > 0 && (
              <Badge 
                variant="destructive" 
                className={NAVBAR_STYLES.MESSAGE_BADGE}
              >
                {messageUnread > 99 ? '99+' : messageUnread}
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={NAVBAR_ROUTES.ADMIN_DASHBOARD} className="cursor-pointer">
                <Shield className={NAVBAR_STYLES.DROPDOWN_ICON} />
                {NAVBAR_CONTENT.ADMIN_PANEL_LABEL}
              </Link>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
          <LogOut className={NAVBAR_STYLES.DROPDOWN_ICON} />
          {NAVBAR_CONTENT.SIGN_OUT_LABEL}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}