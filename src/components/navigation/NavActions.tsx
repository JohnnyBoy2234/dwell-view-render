import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserDropdown } from './UserDropdown';
import { NAVBAR_CONTENT, NAVBAR_ROUTES, NAVBAR_STYLES } from '@/constants/navbarConstants';

interface NavActionsProps {
  loading: boolean;
  user: any;
  messageUnread: number;
  isLandlord: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
}

/**
 * Navigation actions component
 * Handles authenticated and unauthenticated user states
 */
export function NavActions({ 
  loading, 
  user, 
  messageUnread, 
  isLandlord, 
  isAdmin, 
  onSignOut 
}: NavActionsProps) {
  if (loading) {
    return (
      <div className={NAVBAR_STYLES.DESKTOP_ACTIONS}>
        <div className={NAVBAR_STYLES.LOADING_PLACEHOLDER} />
      </div>
    );
  }

  if (user) {
    return (
      <div className={NAVBAR_STYLES.DESKTOP_ACTIONS}>
        {isLandlord && (
          <Button 
            asChild 
            className={NAVBAR_STYLES.LIST_PROPERTY_BUTTON}
          >
            <Link to={NAVBAR_ROUTES.LIST_PROPERTY}>
              {NAVBAR_CONTENT.LIST_PROPERTY_LABEL}
            </Link>
          </Button>
        )}
        
        <NotificationBell />
        
        <UserDropdown
          user={user}
          messageUnread={messageUnread}
          isLandlord={isLandlord}
          isAdmin={isAdmin}
          onSignOut={onSignOut}
        />
      </div>
    );
  }

  return (
    <div className={NAVBAR_STYLES.DESKTOP_ACTIONS}>
      {/* Hide List Property for signed-out users to avoid tenant confusion */}
      
      <Button 
        asChild 
        variant={NAVBAR_STYLES.SIGN_IN_BUTTON}
      >
        <Link to={NAVBAR_ROUTES.AUTH}>
          {NAVBAR_CONTENT.SIGN_IN_LABEL}
        </Link>
      </Button>
    </div>
  );
}