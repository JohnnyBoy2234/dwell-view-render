import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RotateCw, CheckCircle } from 'lucide-react';
import { cn } from '@mzanzihomes/common/lib/utils';
import type { ConnectionStatus as ConnectionStatusType } from '@/hooks/useWebSocketConnection';

interface ConnectionHealthIndicatorProps {
  status: ConnectionStatusType;
  onlineUsers: Set<string>;
  className?: string;
}

export function ConnectionHealthIndicator({ 
  status, 
  onlineUsers, 
  className 
}: ConnectionHealthIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Auto-hide reconnecting status after successful connection
  useEffect(() => {
    if (status.status === 'connected' && showDetails) {
      const timer = setTimeout(() => setShowDetails(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status.status, showDetails]);

  // Auto-show details during connection issues
  useEffect(() => {
    if (status.status === 'reconnecting' || status.status === 'connecting') {
      setShowDetails(true);
    }
  }, [status.status]);

  const getStatusConfig = () => {
    switch (status.status) {
      case 'connected':
        return {
          icon: CheckCircle,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'connecting':
        return {
          icon: RotateCw,
          text: 'Connecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'reconnecting':
        return {
          icon: RotateCw,
          text: `Reconnecting... (${status.reconnectAttempts}/5)`,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: status.reconnectAttempts >= 5 ? 'Connection failed' : 'Disconnected',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Only show if there are actual connection problems
  if (status.status === 'connected' || status.status === 'connecting') {
    return null;
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200',
        config.bgColor,
        config.borderColor,
        config.color,
        className
      )}
      onClick={() => setShowDetails(!showDetails)}
    >
      <Icon 
        className={cn(
          'h-4 w-4',
          status.status === 'reconnecting' ? 'animate-spin' : ''
        )} 
      />
      <span>{config.text}</span>
      
      {showDetails && onlineUsers.size > 0 && (
        <span className="text-xs opacity-75">
          • {onlineUsers.size} online
        </span>
      )}
      
      {status.lastConnected && showDetails && (
        <span className="text-xs opacity-75">
          • Last: {new Date(status.lastConnected).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}