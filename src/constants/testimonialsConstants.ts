export interface Testimonial {
  name: string;
  role: string;
  location: string;
  rating: number;
  content: string;
}

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    name: "Sarah Johnson",
    role: "Tenant",
    location: "Cape Town",
    rating: 5,
    content: "RentLekker made finding my perfect apartment so easy. The verification process gave me confidence, and I saved thousands in agent fees!"
  },
  {
    name: "Michael van der Merwe", 
    role: "Landlord",
    location: "Johannesburg",
    rating: 5,
    content: "As a landlord, I love how RentLekker handles everything - from tenant screening to lease agreements. It's professional and secure."
  },
  {
    name: "Priya Patel",
    role: "Tenant", 
    location: "Durban",
    rating: 5,
    content: "The maintenance manager feature is fantastic! I can report issues directly and track progress. Makes renting stress-free."
  },
  {
    name: "David Thompson",
    role: "Landlord",
    location: "Pretoria", 
    rating: 5,
    content: "Finally, a rental platform that puts safety first. All tenants are verified and the digital contracts are legally sound."
  }
];

export const TESTIMONIALS_CONFIG = {
  AUTO_SLIDE_INTERVAL: 5000,
  TRANSITION_DURATION: 500,
} as const;

export const TESTIMONIALS_STYLES = {
  SECTION: "py-16 md:py-24 bg-gradient-to-br from-ocean-blue/5 to-success-green/5",
  CONTAINER: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  CAROUSEL_CONTAINER: "relative max-w-4xl mx-auto",
  SLIDE_CONTAINER: "overflow-hidden",
  SLIDES_WRAPPER: "flex transition-transform duration-500 ease-in-out",
  SLIDE: "w-full flex-shrink-0",
  CARD: "mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm",
  CARD_CONTENT: "p-8 text-center",
  QUOTE_ICON: "h-8 w-8 text-ocean-blue mx-auto mb-4",
  TESTIMONIAL_TEXT: "text-lg text-foreground mb-6 italic",
  STARS_CONTAINER: "flex justify-center mb-4",
  STAR: "h-5 w-5 text-earth-warm fill-current",
  USER_NAME: "font-semibold text-foreground",
  USER_INFO: "text-muted-foreground",
  DOTS_CONTAINER: "flex justify-center mt-8 gap-2",
  DOT_BASE: "w-3 h-3 rounded-full transition-colors duration-300",
  DOT_ACTIVE: "bg-ocean-blue",
  DOT_INACTIVE: "bg-muted border border-border",
} as const;