import { cn } from '@/lib/utils';
import type { Benefit } from '@/constants/benefitsConstants';

interface BenefitCardProps {
  benefit: Benefit;
}

/**
 * Individual benefit card component
 * Displays a single benefit with icon, title, and description
 */
export function BenefitCard({ benefit }: BenefitCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
      <div className="flex-shrink-0">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-5xl md:text-6xl">
          <span 
            role="img" 
            aria-label={benefit.title}
          >
            {benefit.icon}
          </span>
        </div>
      </div>
      <div className="text-center md:text-left">
        <h3 
          className={cn(
            'text-2xl font-bold mb-2',
            benefit.highlight 
              ? 'text-primary font-extrabold' 
              : 'text-blue-600'
          )}
        >
          {benefit.title}
        </h3>
        <p className="text-gray-600">{benefit.text}</p>
      </div>
    </div>
  );
}