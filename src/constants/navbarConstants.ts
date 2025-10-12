import { Home, Search, Heart, User, LogOut, LayoutDashboard, MessageCircle, Bell, Shield, Send, BadgeDollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/safe-renting", label: "Safe Renting", icon: Shield },
  { path: "/properties", label: "Find Rental", icon: Search },
  { path: "/pricing", label: "Pricing", icon: BadgeDollarSign },
  { path: "/blog", label: "Blog", icon: Send },
  { path: "/about", label: "About", icon: Send },
  { path: "/contact", label: "Contact", icon: Send }
];

export const NAVBAR_CONTENT = {
  BRAND_NAME: "SwiftRent",
  LIST_PROPERTY_LABEL: "List Property",
  SIGN_IN_LABEL: "Sign In",
  DASHBOARD_LABEL: "Dashboard",
  MESSAGES_LABEL: "Messages",
  ADMIN_PANEL_LABEL: "Admin Panel",
  SIGN_OUT_LABEL: "Sign Out",
} as const;

export const NAVBAR_ROUTES = {
  HOME: "/",
  LIST_PROPERTY: "/list-property",
  AUTH: "/auth",
  MESSAGES: "/messages",
  LANDLORD_DASHBOARD: "/enhancedlandlorddashboard",
  TENANT_DASHBOARD: "/tenant-dashboard",
  ADMIN_DASHBOARD: "/admin/dashboard",
} as const;

export const NAVBAR_STYLES = {
  NAV: "bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-30",
  CONTAINER: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  HEADER: "flex justify-between items-center h-16",
  LOGO_CONTAINER: "flex items-center space-x-2",
  LOGO_ICON: "w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center",
  LOGO_ICON_INNER: "h-5 w-5 text-white",
  BRAND_TEXT: "text-xl font-bold text-foreground",
  DESKTOP_NAV: "hidden md:flex items-center space-x-8",
  NAV_LINK_BASE: "text-sm font-medium transition-colors hover:text-primary",
  NAV_LINK_ACTIVE: "text-primary",
  NAV_LINK_INACTIVE: "text-muted-foreground",
  DESKTOP_ACTIONS: "hidden md:flex items-center space-x-3",
  LOADING_PLACEHOLDER: "h-9 w-[200px]",
  LIST_PROPERTY_BUTTON: "bg-success-green hover:bg-success-green-dark text-white font-medium",
  USER_BUTTON: "border-border",
  USER_ICON: "h-4 w-4 mr-2",
  DROPDOWN_CONTENT: "bg-background border-border shadow-lg z-50",
  DROPDOWN_ICON: "h-4 w-4 mr-2",
  MESSAGE_BADGE: "h-4 w-4 p-0 text-xs flex items-center justify-center ml-2",
  SIGN_IN_BUTTON: "outline",
} as const;