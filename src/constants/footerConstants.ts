import { Home, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FooterLink {
  label: string;
  href: string;
}





export interface SocialLink {
  icon: LucideIcon;
  href: string;
  label: string;
}

export const FOOTER_LINKS = {
  company: [
    { label: "About", href: "/about" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" }
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Safe Renting Policy", href: "/safe-renting" },
    { label: "FAQ", href: "/faq" }
  ],
  services: [
    { label: "List Property", href: "/list-property" },
    { label: "Find Rental", href: "/properties" },
    { label: "Pricing", href: "/pricing" },
    { label: "Maintenance", href: "/maintenance" }
  ]
} as const;

export const SOCIAL_LINKS: SocialLink[] = [
  { icon: Facebook, href: "https://facebook.com/MzanziHomes", label: "Facebook" },
  { icon: Twitter, href: "https://twitter.com/MzanziHomes", label: "Twitter" },
  { icon: Instagram, href: "https://instagram.com/MzanziHomes", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com/company/MzanziHomes", label: "LinkedIn" }
];

export const FOOTER_CONTENT = {
  BRAND_NAME: "MzanziHomes",
  TAGLINE: "Safe, Simple, Commission-Free Renting. Direct landlord-tenant connections with full verification and peace of mind.",
  COPYRIGHT: "© 2025 MzanziHomes.com All rights reserved.",
  MADE_WITH: "Made with ❤️ in South Africa",
  SECTIONS: {
    COMPANY: "Company",
    SERVICES: "Services", 
    LEGAL: "Legal"
  }
} as const;

export const FOOTER_STYLES = {
  FOOTER: "bg-gradient-to-br from-foreground to-muted-foreground text-white",
  CONTAINER: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12",
  GRID: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8",
  BRAND_SECTION: "lg:col-span-1",
  BRAND_LINK: "flex items-center space-x-2 mb-4",
  BRAND_ICON: "w-10 h-10 bg-ocean-blue rounded-lg flex items-center justify-center",
  BRAND_ICON_INNER: "h-6 w-6 text-white",
  BRAND_TEXT: "text-2xl font-bold",
  TAGLINE: "text-white/80 mb-6 max-w-sm",
  SOCIAL_CONTAINER: "flex space-x-4",
  SOCIAL_LINK: "w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-300",
  SOCIAL_ICON: "h-5 w-5",
  SECTION_TITLE: "text-lg font-semibold mb-4",
  LINK_LIST: "space-y-2",
  LINK: "text-white/80 hover:text-white transition-colors duration-300",
  BOTTOM_SECTION: "border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center",
  COPYRIGHT: "text-white/60 text-sm mb-4 md:mb-0",
  MADE_WITH: "text-white/60 text-sm",
} as const;