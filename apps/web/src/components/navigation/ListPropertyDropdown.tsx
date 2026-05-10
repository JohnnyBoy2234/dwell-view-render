import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Home, DollarSign } from "lucide-react";
import { NAVBAR_ROUTES, NAVBAR_CONTENT, NAVBAR_STYLES } from '@/constants/navbarConstants';

export function ListPropertyDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={NAVBAR_STYLES.LIST_PROPERTY_BUTTON}>
          {NAVBAR_CONTENT.LIST_PROPERTY_LABEL}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={NAVBAR_STYLES.DROPDOWN_CONTENT}>
        <DropdownMenuItem asChild>
          <Link to={NAVBAR_ROUTES.LIST_RENTAL} className="flex items-center">
            <Home className="h-4 w-4 mr-2" />
            List Rental Property
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={NAVBAR_ROUTES.LIST_SALE} className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            List Property for Sale
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
