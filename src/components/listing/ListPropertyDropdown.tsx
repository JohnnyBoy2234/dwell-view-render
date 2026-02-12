import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Home, DollarSign } from 'lucide-react';

export default function ListPropertyDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-ocean-blue hover:bg-ocean-blue/90 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">
          List Property
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/list-property/rent" className="flex items-center gap-3 w-full">
            <Home className="h-4 w-4" />
            List a Rental
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/list-property/sale" className="flex items-center gap-3 w-full">
            <DollarSign className="h-4 w-4" />
            List a Sale
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
