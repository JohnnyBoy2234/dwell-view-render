import * as React from "react";
import { LucideProps } from "lucide-react";

export const RandMoneyBagIcon = React.forwardRef<SVGSVGElement, LucideProps>(
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
      {/* Money bag shape */}
      <path d="M8 6.5C8 4.567 9.567 3 11.5 3h1C14.433 3 16 4.567 16 6.5V7h1.5c.828 0 1.5.672 1.5 1.5v1.5"/>
      <path d="M7 10.5c0-.828.672-1.5 1.5-1.5h7c.828 0 1.5.672 1.5 1.5v6c0 2.21-1.79 4-4 4h-2c-2.21 0-4-1.79-4-4v-6z"/>
      
      {/* Bag tie/drawstring */}
      <path d="M10 7h4"/>
      <path d="M11 6v2"/>
      <path d="M13 6v2"/>
      
      {/* Letter R in the center */}
      <path d="M10 12h2.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5H10"/>
      <path d="M10 12v6"/>
      <path d="M12.5 15l1.5 3"/>
    </svg>
  )
);

RandMoneyBagIcon.displayName = "RandMoneyBagIcon";