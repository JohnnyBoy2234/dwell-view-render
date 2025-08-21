import * as React from 'react';
import { User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

export function LandlordDashboardHeader() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-gradient-to-r from-ocean-blue to-ocean-blue-dark text-white shadow-soft sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Add Property Button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hidden sm:flex"
              onClick={() => navigate('/dashboard/add-property')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>

            {/* Mobile Add Button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 sm:hidden"
              onClick={() => navigate('/dashboard/add-property')}
            >
              <Plus className="h-5 w-5" />
            </Button>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-white hover:bg-white/10"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/messages')}>
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/add-property')}>
                  Add Property
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}