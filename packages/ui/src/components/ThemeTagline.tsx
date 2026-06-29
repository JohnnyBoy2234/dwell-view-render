import { cn } from "@mzanzihomes/common/lib/utils";

interface ThemeTaglineProps {
  variant?: "hero" | "eyebrow" | "header";
  className?: string;
}

export function ThemeTagline({ variant = "eyebrow", className }: ThemeTaglineProps) {
  const baseClasses = "text-center font-medium";
  
  const variantClasses = {
    hero: "text-lg md:text-xl text-white/90 mb-8",
    eyebrow: "text-sm md:text-base text-muted-foreground mb-2 uppercase tracking-wide",
    header: "text-base md:text-lg text-muted-foreground mb-4"
  };

  return (
    <p className={cn(baseClasses, variantClasses[variant], className)}>
      From Listing to Lease, Made Easy
    </p>
  );
}
