import { Clock, Check, CheckCheck, AlertCircle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageStatusIndicatorProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  className?: string;
}

export function MessageStatusIndicator({ status, className }: MessageStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'sending':
        return {
          icon: RotateCw,
          className: 'text-muted-foreground animate-spin',
          ariaLabel: 'Sending message'
        };
      case 'sent':
        return {
          icon: Check,
          className: 'text-muted-foreground',
          ariaLabel: 'Message sent'
        };
      case 'delivered':
        return {
          icon: CheckCheck,
          className: 'text-muted-foreground',
          ariaLabel: 'Message delivered'
        };
      case 'read':
        return {
          icon: CheckCheck,
          className: 'text-green-400',
          ariaLabel: 'Message read'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          className: 'text-red-500',
          ariaLabel: 'Message failed to send'
        };
      default:
        return {
          icon: Clock,
          className: 'text-muted-foreground',
          ariaLabel: 'Unknown status'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span 
      className={cn('inline-flex items-center', className)}
      aria-label={config.ariaLabel}
    >
      <Icon className={cn('h-3 w-3', config.className)} />
    </span>
  );
}