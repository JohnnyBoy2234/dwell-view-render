import { Shield, Lock, FileCheck, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SafetyFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const SAFETY_FEATURES: SafetyFeature[] = [
  {
    icon: Shield,
    title: "ID & Email Verification",
    description: "Every user is verified before they can list or view properties"
  },
  {
    icon: Lock,
    title: "Fraud Protection & Moderated Listings", 
    description: "All listings are reviewed and users are monitored for suspicious activity"
  },
  {
    icon: FileCheck,
    title: "Encrypted Digital Leases",
    description: "Secure e-signature contracts with full legal protection"
  },
  {
    icon: MessageSquareText,
    title: "Secure Messaging",
    description: "Chat only with verified users through our secure platform"
  }
];

export const SAFE_RENTING_CONTENT = {
  TITLE: "Your Safety, Our Priority",
  SUBTITLE: "We've built comprehensive safety measures into every part of the rental process",
  CTA_TEXT: "Learn More About Safe Renting",
  CTA_LINK: "/safe-renting",
} as const;

export const SAFE_RENTING_STYLES = {
  SECTION: "py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto",
  HEADER: "text-center mb-12",
  ICON_CONTAINER: "w-20 h-20 bg-ocean-blue rounded-2xl flex items-center justify-center shadow-lg",
  MAIN_ICON: "h-10 w-10 text-white",
  TITLE: "text-3xl md:text-4xl font-bold text-white mb-4",
  SUBTITLE: "text-lg text-white/80 max-w-2xl mx-auto",
  GRID: "grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12",
  CARD: "text-center bg-white/10 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300",
  CARD_CONTENT: "p-8",
  FEATURE_ICON_CONTAINER: "w-16 h-16 bg-ocean-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg",
  FEATURE_ICON: "h-8 w-8 text-white",
  FEATURE_TITLE: "text-xl font-semibold text-foreground mb-2",
  FEATURE_DESCRIPTION: "text-muted-foreground text-sm leading-relaxed",
  CTA_CONTAINER: "text-center",
  CTA_BUTTON: "bg-ocean-blue hover:bg-ocean-blue-dark text-white rounded-xl px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300",
} as const;