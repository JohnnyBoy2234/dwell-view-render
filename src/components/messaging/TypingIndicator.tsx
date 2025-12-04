import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userNames: string[];
  className?: string;
}

export function TypingIndicator({ userNames, className }: TypingIndicatorProps) {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 3);
    }, 350);

    return () => clearInterval(interval);
  }, []);

  if (userNames.length === 0) return null;

  const getTypingText = () => {
    if (userNames.length === 1) {
      return `${userNames[0]} is typing`;
    }
    if (userNames.length === 2) {
      return `${userNames[0]} and ${userNames[1]} are typing`;
    }
    return `${userNames[0]} and ${userNames.length - 1} others are typing`;
  };

  return (
    <div className={cn('flex justify-start', className)}>
      <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-2 shadow-soft">
        <div className="flex items-center gap-1 text-emerald-600">
          {[0, 1, 2].map((idx) => (
            <span
              key={idx}
              className="block h-2 w-2 rounded-full bg-current opacity-40"
              style={{
                opacity: idx === activeDot ? 1 : 0.35,
                transform: idx === activeDot ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'opacity 0.2s ease, transform 0.2s ease'
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-emerald-700">{getTypingText()}</span>
      </div>
    </div>
  );
}