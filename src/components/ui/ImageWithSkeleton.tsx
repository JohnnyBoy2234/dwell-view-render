import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageSkeleton } from "./ImageSkeleton";

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  skeletonClassName?: string;
  aspectRatio?: 'square' | '4/3' | '16/9' | 'auto';
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

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

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
        className={cn(
          className,
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
}
