import { cn } from "@/lib/utils";
import { ThemeTagline } from "./ThemeTagline";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  showTagline?: boolean;
  taglineVariant?: "eyebrow" | "header";
  className?: string;
  invert?: boolean;
}

export function SectionHeader({ 
  title, 
  subtitle, 
  showTagline = false, 
  taglineVariant = "eyebrow",
  className,
  invert = false,
}: SectionHeaderProps) {
  return (
    <div className={cn("text-center mb-12 md:mb-16", className)}>
      {showTagline && (
        <ThemeTagline variant={taglineVariant} />
      )}
      <h2 className={cn("text-2xl md:text-3xl font-semibold mb-4", invert ? "text-white" : "text-foreground") }>
        {title}
      </h2>
      {subtitle && (
        <p className={cn("text-lg max-w-3xl mx-auto", invert ? "text-white/80" : "text-muted-foreground") }>
          {subtitle}
        </p>
      )}
    </div>
  );
}
