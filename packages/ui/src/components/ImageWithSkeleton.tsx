import { useState } from "react";
import { cn } from "@/lib/utils";
import { Home } from "lucide-react";

const aspectClasses = {
  'square': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
  'auto': '',
} as const;

type AspectRatio = keyof typeof aspectClasses;

interface ImageSkeletonProps {
  className?: string;
  aspectRatio?: AspectRatio;
  showIcon?: boolean;
}

function ImageSkeleton({ className, aspectRatio = 'auto', showIcon = true }: ImageSkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-muted flex items-center justify-center", aspectClasses[aspectRatio], className)}>
      {showIcon && <Home className="h-8 w-8 text-muted-foreground/30" />}
    </div>
  );
}

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  skeletonClassName?: string;
  aspectRatio?: AspectRatio;
  showIcon?: boolean;
}

export function ImageWithSkeleton({
  src,
  alt,
  className,
  skeletonClassName,
  aspectRatio = 'auto',
  showIcon = true,
  ...props
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <ImageSkeleton
        className={cn(className, skeletonClassName)}
        aspectRatio={aspectRatio}
        showIcon={showIcon}
      />
    );
  }

  return (
    <div className={cn("relative", skeletonClassName)}>
      {isLoading && (
        <ImageSkeleton
          className={cn("absolute inset-0", className)}
          aspectRatio={aspectRatio}
          showIcon={showIcon}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, "transition-opacity duration-300", isLoading ? "opacity-0" : "opacity-100")}
        onLoad={() => setIsLoading(false)}
        onError={() => { setIsLoading(false); setHasError(true); }}
        {...props}
      />
    </div>
  );
}
