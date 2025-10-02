import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, FileText, Info, Shield, Mail, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, signOut, loading } = useAuth();

  if (!isMobile) return null;

  const menuItems = [
    { path: '/safe-renting', label: 'Safe Renting', icon: Shield },
    { path: '/pricing', label: 'Pricing', icon: Info },
    { path: '/about', label: 'About', icon: Info },
    { path: '/contact', label: 'Contact', icon: Mail },
    { path: '/blog', label: 'Blog', icon: FileText }
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      setOpen(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Menu</h2>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          
          <nav className="space-y-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-base font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {!loading && user && (
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="destructive"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}