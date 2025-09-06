import * as React from "react";
import { LucideProps } from "lucide-react";

export const RandIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Rectangle border */}
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      {/* Letter R */}
      <path d="M8 7h4c1.1 0 2 .9 2 2s-.9 2-2 2H8" />
      <path d="M8 7v10" />
      <path d="M12 11l3 6" />
    </svg>
  )
);

RandIcon.displayName = "RandIcon";