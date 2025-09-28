import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userNames: string[];
  className?: string;
}

export function TypingIndicator({ userNames, className }: TypingIndicatorProps) {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (userNames.length === 0) return null;

  const getTypingText = () => {
    if (userNames.length === 1) {
      return `${userNames[0]} is typing`;
    } else if (userNames.length === 2) {
      return `${userNames[0]} and ${userNames[1]} are typing`;
    } else {
      return `${userNames[0]} and ${userNames.length - 1} others are typing`;
    }
  };

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground py-2 px-4', className)}>
      <div className="flex items-center gap-1">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 bg-current rounded-full transition-opacity duration-300',
              i <= dots ? 'opacity-100' : 'opacity-30'
            )}
          />
        ))}
      </div>
      <span className="text-xs">{getTypingText()}</span>
    </div>
  );
}