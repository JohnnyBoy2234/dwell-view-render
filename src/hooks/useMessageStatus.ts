import { useMemo } from 'react';

export interface MessageStatusConfig {
  isOwn: boolean;
  isOptimistic?: boolean;
  isRead?: boolean;
}

export type MessageStatusType = 'sending' | 'delivered' | 'read' | 'none';

export interface MessageStatusResult {
  statusType: MessageStatusType;
  ariaLabel: string;
}

/**
 * Hook to determine message status and accessibility label
 */
export function useMessageStatus({ isOwn, isOptimistic, isRead }: MessageStatusConfig): MessageStatusResult {
  return useMemo(() => {
    if (!isOwn) {
      return {
        statusType: 'none',
        ariaLabel: '',
      };
    }

    if (isOptimistic) {
      return {
        statusType: 'sending',
        ariaLabel: 'Sending message',
      };
    }

    if (isRead) {
      return {
        statusType: 'read',
        ariaLabel: 'Message read',
      };
    }

    return {
      statusType: 'delivered',
      ariaLabel: 'Message delivered',
    };
  }, [isOwn, isOptimistic, isRead]);
}