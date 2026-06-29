import { Wifi, WifiOff, RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@mzanzihomes/common/lib/utils';
import type { ConnectionStatus as ConnectionStatusType } from '@/hooks/useWebSocketConnection';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  className?: string;
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status.status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'connecting':
        return {
          icon: RotateCw,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'reconnecting':
        return {
          icon: RotateCw,
          text: `Reconnecting... (${status.reconnectAttempts})`,
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          variant: 'outline' as const,
          className: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon className={cn(
        'h-3 w-3',
        status.status === 'connecting' || status.status === 'reconnecting' ? 'animate-spin' : ''
      )} />
      {config.text}
    </Badge>
  );
}