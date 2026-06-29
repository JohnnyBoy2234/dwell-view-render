import { MessageSquare } from 'lucide-react';
import { LOADING_SKELETON_COUNT } from '@mzanzihomes/common/constants/messagesConstants';

/**
 * Loading state component for messages
 * Shows skeleton UI while conversations are being fetched
 */
export function MessagesLoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-6 w-6 text-ocean-blue" />
        <h2 className="text-xl font-bold">Messages</h2>
        <div className="animate-pulse bg-muted h-6 w-12 rounded-full"></div>
      </div>
      
      {Array.from({ length: LOADING_SKELETON_COUNT }, (_, i) => (
        <div key={i} className="animate-pulse bg-muted h-20 rounded-lg"></div>
      ))}
    </div>
  );
}