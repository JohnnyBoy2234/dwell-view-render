import * as React from "react";
import { LucideProps } from "lucide-react";

// Chunky money bag with prominent R symbol
export const RandMoneyBagIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, ...props }, ref) => (
    <svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {/* Money bag drawstring knot */}
      <path d="M10 3c0-1.1.9-2 2-2s2 .9 2 2v1h-4V3z" fill="currentColor" opacity="0.8"/>
      
      {/* Drawstring band */}
      <rect x="7" y="4" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.9"/>
      
      {/* Main chunky bag body - wide and full */}
      <path d="M6 6.5c-1.5 1-2.5 2.8-2.5 4.8 0 3.5 2.5 6.5 6 7.5.8.2 1.6.2 2.5.2s1.7 0 2.5-.2c3.5-1 6-4 6-7.5 0-2-1-3.8-2.5-4.8-1-0.7-2.2-1.2-3.5-1.4-1.3-0.2-2.7-0.2-4 0-1.3 0.2-2.5 0.7-3.5 1.4z" 
            fill="currentColor"/>
      
      {/* Bag highlight for depth */}
      <ellipse cx="12" cy="8" rx="6" ry="1.5" fill="currentColor" opacity="0.3"/>
      
      {/* Large prominent R symbol in center */}
      <g transform="translate(12, 13)">
        {/* R letter - bold and prominent */}
        <path d="M-2.5 -3h2c1.1 0 2 .9 2 2s-.9 2-2 2h-1l1.8 2.5h-1.3l-1.5-2.5h-1v2.5h-1V-3z
                 M-1.5 -2v2h1c.6 0 1-.4 1-1s-.4-1-1-1h-1z" 
              fill="hsl(var(--background))" 
              stroke="none"/>
      </g>
      
      {/* Scattered coins around the bag */}
      <circle cx="4" cy="10" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="20" cy="12" r="0.8" fill="currentColor" opacity="0.5"/>
      <circle cx="3" cy="16" r="0.7" fill="currentColor" opacity="0.4"/>
    </svg>
  )
);

RandMoneyBagIcon.displayName = "RandMoneyBagIcon";