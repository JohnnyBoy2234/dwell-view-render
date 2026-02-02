import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { MobileSidebar } from "@/components/MobileSidebar";
import { NavItems } from '@/components/navigation/NavItems';
import { NavActions } from '@/components/navigation/NavActions';
import { NAVBAR_CONTENT, NAVBAR_STYLES, NAVBAR_ROUTES } from '@/constants/navbarConstants';
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

/**
 * Main navigation component
 * Provides responsive navigation with mobile sidebar and desktop menu
 */
const Navbar = () => {
  const { user, signOut, isLandlord, isAdmin, loading } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();
  const location = useLocation();

  const isHome = location.pathname === '/';

  const navClassName = `${NAVBAR_STYLES.NAV} sticky top-0 z-30`;
  const logoIconClassName = NAVBAR_STYLES.LOGO_ICON;
  const logoIconInnerClassName = NAVBAR_STYLES.LOGO_ICON_INNER;
  const brandTextClassName = NAVBAR_STYLES.BRAND_TEXT;

  return (
    <nav className={navClassName}>
      <div className={NAVBAR_STYLES.CONTAINER}>
        <div className={NAVBAR_STYLES.HEADER}>
          {/* Logo */}
          <Link to="/" className={NAVBAR_STYLES.LOGO_CONTAINER}>
            <div className={logoIconClassName}>
              <Home className={logoIconInnerClassName} />
            </div>
            <span className={brandTextClassName}>
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