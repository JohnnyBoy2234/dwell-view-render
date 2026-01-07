import { cn } from "@/lib/utils";
import { Home } from "lucide-react";

interface ImageSkeletonProps {
  className?: string;
  aspectRatio?: 'square' | '4/3' | '16/9' | 'auto';
  showIcon?: boolean;
}

export function ImageSkeleton({ 
  className, 
  aspectRatio = 'auto',
  showIcon = true 
}: ImageSkeletonProps) {
  const aspectClasses = {
    'square': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    'auto': '',
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-muted flex items-center justify-center",
        aspectClasses[aspectRatio],
        className
      )}
    >
      {showIcon && (
        <Home className="h-8 w-8 text-muted-foreground/30" />
      )}
    </div>
  );
}
