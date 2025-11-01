import {
  Users,
  Building2,
  Mail,
  Shield,
  Calendar,
  Search,
  FileText,
  Home,
} from "lucide-react";
import { RIcon } from '../components/icons/RIcon';
import type { LucideIcon } from "lucide-react";
import React from 'react';

export interface ProcessStep {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badges: string[];
}

export interface UserTypeData {
  header: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    description: string;
  };
  steps: ProcessStep[];
  cta: {
    text: string;
    link: string;
  };
}

export const TENANT_DATA: UserTypeData = {
  header: {
    icon: Home,
    title: "For Tenants",
    subtitle: "Find Your Home",
    description:
      "Find your perfect home directly from landlords with no agent fees or middlemen.",
  },
  steps: [
    {
      icon: Search,
      title: "Search & Filter",
      description:
        "Browse verified listings with detailed photos, descriptions, and transparent pricing.",
      badges: ["Verified Listings", "Smart Filters", "Detailed Photos"],
    },
    {
      icon: Calendar,
      title: "Book Viewings",
      description:
        "Chat directly with landlords and schedule viewings at convenient times.",
      badges: ["Direct Contact", "Flexible Scheduling", "No Agent Calls"],
    },
    {
      icon: FileText,
      title: "Apply Online",
      description:
        "Submit secure applications with all your documents in one place.",
      badges: ["Secure Documents", "Easy Applications", "Fast Processing"],
    },
    {
      icon: Home,
      title: "Move In",
      description:
        "Sign digital contracts and move into your new home with confidence.",
      badges: ["Digital Contracts", "Secure Payments", "Move-in Support"],
    },
  ],
  cta: {
    text: "Find Your Home",
    link: "/properties",
  },
};

export const LANDLORD_DATA: UserTypeData = {
  header: {
    icon: Users,
    title: "For Landlords",
    subtitle: "List Your Property",
    description:
      "List your property and connect with quality tenants without paying agent commissions.",
  },
  steps: [
    {
      icon: Building2,
      title: "List Your Property",
      description:
        "Create a professional listing in minutes with photos, details, and your rental price.",
      badges: ["Easy Setup", "Photo Upload", "Rich Descriptions"],
    },
    {
      icon: Mail,
      title: "Book Viewings",
      description:
        "Chat directly with tenants and schedule viewings at times that suit you.",
      badges: ["Direct Contact", "Scheduling", "No Agents"],
    },
    {
      icon: Shield,
      title: "Receive Applications",
      description:
        "Get organized applications online, review instantly, and screen tenants with confidence.",
      badges: ["Easy Applications", "Screening", "Fast Processing"],
    },
    {
      icon: RIcon,
      title: "Manage Properties",
      description:
        "Control all your rentals in one place simple, fast, and effortless.",
      badges: ["Maintenance Tracking", "Financial SwiftBooks"],
    },
  ],
  cta: {
    text: "List Your Property",
    link: "/list-property",
  },
};

export const COLOR_SCHEMES = {
  TENANT: [
    "from-ocean-blue to-ocean-blue-light",
    "from-earth-warm to-earth-warm-dark",
    "from-success-green to-success-green-glow",
    "from-purple-500 to-purple-600",
  ],
  LANDLORD: [
    "from-success-green to-success-green-glow",
    "from-earth-warm to-earth-warm-dark",
    "from-ocean-blue to-ocean-blue-light",
    "from-purple-500 to-purple-600",
  ],
};

export const HOW_IT_WORKS_CONTENT = {
  TITLE: "How RentLekker Works",
  SUBTITLE: "Connecting landlords and tenants directly with no agents, zero commission, and full control",
} as const;

export const HOW_IT_WORKS_STYLES = {
  SECTION: "py-16 sm:py-20 lg:py-24",
  CONTAINER: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
  MOBILE_TOGGLE: "pb-12 md:hidden",
  TOGGLE_CONTAINER: "flex items-center justify-center space-x-4",
  TOGGLE_LABEL_BASE: "font-medium transition-colors",
  TOGGLE_ACTIVE_TENANT: "text-[hsl(var(--sr-blue))]",
  TOGGLE_ACTIVE_LANDLORD: "text-[hsl(var(--sr-green))]",
  TOGGLE_INACTIVE: "text-[hsl(var(--sr-muted))]",
  TOGGLE_SWITCH: "transition-colors data-[state=checked]:!bg-[hsl(var(--sr-green))] data-[state=unchecked]:!bg-[hsl(var(--sr-blue))]",
  CARDS_SECTION: "pb-8 sm:pb-12 lg:pb-16",
  CARDS_CONTAINER: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
  CARDS_WRAPPER: "relative",
  MOBILE_CARD: "md:hidden",
  DESKTOP_CARDS: "hidden md:grid md:grid-cols-2 md:gap-8 lg:gap-12",
} as const;