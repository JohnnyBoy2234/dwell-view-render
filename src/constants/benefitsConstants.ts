export interface Benefit {
  icon: string;
  title: string;
  text: string;
  highlight?: boolean;
}

export const BENEFITS_DATA: Benefit[] = [
  {
    icon: "💰",
    title: "No Agent Fees",
    text: "Save money with zero commission and full control of your rental.",
  },
  {
    icon: "🤝",
    title: "Direct Connections",
    text: "Chat directly with landlords or tenants and skip the middlemen.",
  },
  {
    icon: "⚡",
    title: "Simple & Fast Setup",
    text: "List a property or find a home in minutes with guided steps.",
  },
  {
    icon: "💙",
    title: "Zero Commission",
    text: "Keep 100% of your rental income with no hidden fees or agent costs.",
    highlight: true,
  },
  {
    icon: "🔒",
    title: "Secure Online Payments",
    text: "Collect and pay rent reliably with safe, automated payments.",
  },
  {
    icon: "🛠️",
    title: "Smart Tools Included",
    text: "Enjoy built-in tenant screening, maintenance tracking, and reports.",
  },
  {
    icon: "📱",
    title: "Mobile First",
    text: "Manage your properties and applications from anywhere, anytime.",
  },
];

export const BENEFITS_SECTION = {
  TITLE: "Why Choose SwiftRent?",
  SUBTITLE: "The smarter, simpler way to rent — for landlords and tenants alike.",
} as const;

export const SWIPER_CONFIG = {
  SLIDES_PER_VIEW: 3,
  SPEED: 600,
  LOOP: true,
  CLASS_NAME: "benefits-swiper pb-12",
} as const;