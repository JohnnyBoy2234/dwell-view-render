import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Heart, User, LogOut, LayoutDashboard, MessageCircle, Bell, Shield, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUserProperties } from "@/hooks/useUserProperties";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MobileSidebar } from "@/components/MobileSidebar";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut, isLandlord, isAdmin } = useAuth();
  const { unreadCount: messageUnread } = useUnreadMessages();
  const { hasProperties } = useUserProperties();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/properties", label: "Properties", icon: Search },
    { path: "/blog", label: "Blog", icon: User },
    { path: "/about", label: "About", icon: User }
  ];

  return (
    // Use a React Fragment to return the nav and mobile menu as siblings
    <>
      <nav className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Add "Blog" text for Blog page */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                SwiftRent{location.pathname === '/blog' && ' Blog'}
              </span>
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
                  <Button 
                    asChild 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Link to="/messages" className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      Messages
                      {messageUnread > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center ml-1">
                          {messageUnread > 99 ? '99+' : messageUnread}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    className="bg-success-green hover:bg-success-green-dark text-white"
                  >
                    <Link to="/list-property">List Property</Link>
                  </Button>
                  {isLandlord && hasProperties ? (
                    <Button variant="ghost" size="sm" asChild><Link to="/enhancedlandlorddashboard" className="flex items-center relative"><LayoutDashboard className="h-4 w-4 mr-2" />Landlord Dashboard</Link></Button>
                  ) : !isLandlord ? (
                    <Button variant="ghost" size="sm" asChild><Link to="/enhancedtenantdashboard" className="flex items-center relative"><LayoutDashboard className="h-4 w-4 mr-2" />My Dashboard</Link></Button>
                  ) : null}
                  <NotificationBell />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        {user.email?.split('@')[0]}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-background border-border z-50" align="end">
                      <DropdownMenuItem asChild>
                        <Link to={isLandlord ? "/enhancedlandlorddashboard" : "/enhancedtenantdashboard"} className="cursor-pointer">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/admin/dashboard" className="cursor-pointer">
                              <Shield className="h-4 w-4 mr-2" />
                              Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button 
                    asChild 
                    className="bg-success-green hover:bg-success-green-dark text-white"
                  >
                    <Link to="/list-property">List Property</Link>
                  </Button>
                  <Button asChild><Link to="/auth">Sign In</Link></Button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu - Right Side */}
            <MobileSidebar />
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;