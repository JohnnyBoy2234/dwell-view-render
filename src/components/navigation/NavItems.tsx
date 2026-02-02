import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, NAVBAR_STYLES } from '@/constants/navbarConstants';

/**
 * Desktop navigation items component
 * Renders navigation links with active state styling
 */
export function NavItems() {
  const location = useLocation();
  
  // Helper to check if a nav item is active (handles query params)
  const isNavItemActive = (itemPath: string) => {
    const [itemPathname, itemSearch] = itemPath.split('?');
    
    // If the item has a query param (like ?type=rent), check both pathname and param
    if (itemSearch) {
      const searchParams = new URLSearchParams(location.search);
      const itemParams = new URLSearchParams(itemSearch);
      
      // Check if pathname matches and all item params are present
      if (location.pathname !== itemPathname) return false;
      
      for (const [key, value] of itemParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    
    // Simple pathname match for items without query params
    return location.pathname === itemPath;
  };
  
  return (
    <div className={NAVBAR_STYLES.DESKTOP_NAV}>
      {NAV_ITEMS.map(item => {
        const isActive = isNavItemActive(item.path);
        
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