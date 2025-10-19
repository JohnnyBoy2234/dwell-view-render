import { Check, CheckCheck, Clock } from 'lucide-react';
import type { MessageStatusType } from '@/hooks/useMessageStatus';

interface MessageStatusIconProps {
  statusType: MessageStatusType;
  ariaLabel: string;
}

/**
 * Component to render message status icons with proper accessibility
 */
export function MessageStatusIcon({ statusType, ariaLabel }: MessageStatusIconProps) {
  if (statusType === 'none') {
    return null;
  }

  const getIcon = () => {
    switch (statusType) {
      case 'sending':
        return <Clock className="h-4 w-4 opacity-60" />;
      case 'read':
        return <CheckCheck className="h-4 w-4 text-green-400" />;
      case 'delivered':
        return <Check className="h-4 w-4 text-slate-400" />;
      default:
        return null;
    }
  };

  const icon = getIcon();
  
  if (!icon) return null;

  return (
    <span aria-label={ariaLabel}>
      {icon}
    </span>
  );
}