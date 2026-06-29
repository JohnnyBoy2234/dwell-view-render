import { Home } from "lucide-react";
import { cn } from "@mzanzihomes/common/lib/utils";

interface LoadingLogoProps {
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function LoadingLogo({ size = "default", className }: LoadingLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    default: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    default: "h-7 w-7",
    lg: "h-9 w-9",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div 
        className={cn(
          "bg-[#2563EB] rounded-xl flex items-center justify-center animate-pulse",
          sizeClasses[size]
        )}
      >
        <Home className={cn("text-white", iconSizeClasses[size])} />
      </div>
    </div>
  );
}
