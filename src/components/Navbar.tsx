import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Heart, User, Menu, X, LogOut, LayoutDashboard, MessageCircle, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUserProperties } from "@/hooks/useUserProperties";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";

const Navbar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut, isLandlord } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();
  const { notifications, unreadCount: notifUnread, markAsRead } = useNotifications();
  const { hasProperties } = useUserProperties();

  // Prevents the page from scrolling when the mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/properties", label: "Properties", icon: Search },
    { path: "/how-it-works", label: "How It Works", icon: Heart },
    { path: "/about", label: "About", icon: User }
  ];

  return (
    // Use a React Fragment to return the nav and mobile menu as siblings
    <>
      <nav className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">SwiftRent</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map(item => (
                <Link key={item.path} to={item.path} className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === item.path ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <Button variant="outline" asChild><Link to="/list-property">List Property</Link></Button>
                  {isLandlord && hasProperties ? (
                    <Button variant="ghost" size="sm" asChild><Link to="/dashboard" className="flex items-center relative"><LayoutDashboard className="h-4 w-4 mr-2" />Rental Manager</Link></Button>
                  ) : !isLandlord ? (
                    <Button variant="ghost" size="sm" asChild><Link to="/tenant-dashboard" className="flex items-center relative"><LayoutDashboard className="h-4 w-4 mr-2" />My Dashboard</Link></Button>
                  ) : (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/messages" className="flex items-center relative">
                        <MessageCircle className="h-4 w-4 mr-2" />Messages
                        {messageUnread > 0 && <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">{messageUnread > 99 ? '99+' : messageUnread}</Badge>}
                      </Link>
                    </Button>
                  )}
                  <DropdownMenu>{/* Notifications Menu */}</DropdownMenu>
                  <DropdownMenu>{/* User Menu */}</DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild><Link to="/list-property">List Property</Link></Button>
                  <Button asChild><Link to="/auth">Sign In</Link></Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Side-Drawer Menu (Overlay and Panel) */}
      <>
        <div
          className={`fixed inset-0 bg-black/60 z-40 transition-opacity md:hidden ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={`fixed top-0 right-0 h-full w-72 bg-background z-50 transform transition-transform ease-in-out duration-300 md:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 flex justify-between items-center border-b border-border">
              <Link to="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">SwiftRent</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-grow p-4 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === item.path
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-primary hover:bg-secondary"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t border-border space-y-2">
              {user ? (
                <>
                  {isLandlord ? (
                    <Button variant="outline" className="w-full" asChild onClick={() =>setIsMobileMenuOpen(false)}><Link to="/dashboard">Rental Manager</Link></Button>
                  ) : (
                    <Button variant="outline" className="w-full" asChild onClick={() =>setIsMobileMenuOpen(false)}><Link to="/tenant-dashboard">My Dashboard</Link></Button>
                  )}
                  <Button className="w-full" onClick={signOut}><LogOut className="h-4 w-4 mr-2"/>Sign Out</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" asChild><Link to="/list-property">List Property</Link></Button>
                  <Button className="w-full" asChild onClick={() =>setIsMobileMenuOpen(false)}><Link to="/auth">Sign In</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    </>
  );
};

export default Navbar;