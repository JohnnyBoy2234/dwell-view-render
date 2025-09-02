import { cn } from "@/lib/utils";
import { ThemeTagline } from "./ThemeTagline";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  showTagline?: boolean;
  taglineVariant?: "eyebrow" | "header";
  className?: string;
}

export function SectionHeader({ 
  title, 
  subtitle, 
  showTagline = false, 
  taglineVariant = "eyebrow",
  className 
}: SectionHeaderProps) {
  return (
    <div className={cn("text-center mb-12 md:mb-16", className)}>
      {showTagline && (
        <ThemeTagline variant={taglineVariant} />
      )}
      <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}
