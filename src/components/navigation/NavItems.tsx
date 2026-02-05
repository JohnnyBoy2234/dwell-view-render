import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, NAVBAR_STYLES } from '@/constants/navbarConstants';

/**
 * Desktop navigation items component
 * Renders navigation links with active state styling
 */
export function NavItems() {
  const location = useLocation();
  
  return (
    <div className={NAVBAR_STYLES.DESKTOP_NAV}>
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path;
        
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`${NAVBAR_STYLES.NAV_LINK_BASE} ${
              isActive 
                ? NAVBAR_STYLES.NAV_LINK_ACTIVE 
                : NAVBAR_STYLES.NAV_LINK_INACTIVE
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}