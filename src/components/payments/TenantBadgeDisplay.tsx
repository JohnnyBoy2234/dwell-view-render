import { Award, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TenantBadgeDisplayProps {
  badges?: Array<{
    badge_year: number;
    stars_count: number;
  }>;
  currentYearStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export default function TenantBadgeDisplay({ 
  badges = [], 
  currentYearStars = 0,
  size = 'md',
  showTooltip = true
}: TenantBadgeDisplayProps) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const starSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (badges.length === 0 && currentYearStars === 0) {
    return null;
  }

  const content = (
    <div className="flex items-center gap-2">
      {/* Show badges */}
      {badges.map((badge) => (
        <div key={badge.badge_year} className="relative">
          <Award 
            className={`${sizeClasses[size]} text-yellow-500 fill-yellow-500`} 
          />
          <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {badge.badge_year.toString().slice(-2)}
          </span>
        </div>
      ))}
      
      {/* Show current year star progress */}
      {currentYearStars > 0 && currentYearStars < 12 && (
        <Badge variant="secondary" className="gap-1">
          <Star className={`${starSizeClasses[size]} fill-yellow-400 text-yellow-400`} />
          <span className="text-xs font-semibold">{currentYearStars}/12</span>
        </Badge>
      )}
    </div>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            {badges.length > 0 && (
              <div>
                <p className="font-semibold text-xs">Reliable Tenant Badges:</p>
                {badges.map((badge) => (
                  <p key={badge.badge_year} className="text-xs">
                    {badge.badge_year}: {badge.stars_count} stars earned
                  </p>
                ))}
              </div>
            )}
            {currentYearStars > 0 && currentYearStars < 12 && (
              <p className="text-xs">
                Current year: {currentYearStars}/12 stars (on track for {new Date().getFullYear()} badge)
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
