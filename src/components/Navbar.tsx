import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { MobileSidebar } from "@/components/MobileSidebar";
import { NavItems } from '@/components/navigation/NavItems';
import { NavActions } from '@/components/navigation/NavActions';
import { NAVBAR_CONTENT, NAVBAR_STYLES, NAVBAR_ROUTES } from '@/constants/navbarConstants';
import { Button } from "@/components/ui/button";

/**
 * Main navigation component
 * Provides responsive navigation with mobile sidebar and desktop menu
 */
const Navbar = () => {
  const { user, signOut, isLandlord, isAdmin, loading } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();

  return (
    <nav className={NAVBAR_STYLES.NAV}>
      <div className={NAVBAR_STYLES.CONTAINER}>
        <div className={NAVBAR_STYLES.HEADER}>
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/android-chrome-512x512.png"
              alt={NAVBAR_CONTENT.BRAND_NAME} 
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold text-foreground">
              {NAVBAR_CONTENT.BRAND_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <NavItems />

          {/* Desktop Action Buttons */}
          <NavActions
            loading={loading}
            user={user}
            messageUnread={messageUnread}
            isLandlord={isLandlord}
            isAdmin={isAdmin}
            onSignOut={signOut}
          />

          {/* Mobile Actions */}
          <div className="flex items-center md:hidden gap-2">
            <MobileSidebar />
            {!loading && !user && (
              <Button
                asChild
                size="sm"
                className="bg-ocean-blue text-white hover:bg-ocean-blue-dark"
              >
                <Link to={NAVBAR_ROUTES.AUTH}>{NAVBAR_CONTENT.SIGN_IN_LABEL}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;