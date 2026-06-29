import { useMemo } from 'react';
import { format } from 'date-fns';
import { TIME_FORMATS } from '@mzanzihomes/common/constants/messageConstants';

export interface MessageFormattingOptions {
  createdAt: string;
}

export interface FormattedMessage {
  displayTime: string;
  isToday: boolean;
}

/**
 * Hook to format message timestamps consistently
 */
export function useMessageFormatting({ createdAt }: MessageFormattingOptions): FormattedMessage {
  return useMemo(() => {
    try {
      const messageTime = new Date(createdAt);
      const now = new Date();
      const isToday = now.toDateString() === messageTime.toDateString();
      
      const displayTime = isToday
        ? format(messageTime, TIME_FORMATS.TODAY)
        : format(messageTime, TIME_FORMATS.OTHER_DAYS);
      
      return { displayTime, isToday };
    } catch (error) {
      console.error('Failed to format message time:', error);
      return { displayTime: 'Invalid time', isToday: false };
    }
  }, [createdAt]);
}