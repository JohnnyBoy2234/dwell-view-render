import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { EMPTY_STATE_MESSAGES } from '@/constants/messagesConstants';

interface MessagesEmptyStateProps {
  isLandlord: boolean;
}

/**
 * Empty state component for when no messages exist
 * Shows appropriate message based on user role
 */
export function MessagesEmptyState({ isLandlord }: MessagesEmptyStateProps) {
  return (
    <Card className="text-center p-8">
      <CardContent>
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <div className="flex items-center justify-center mb-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
          <h3 className="text-lg font-semibold">Loading messages...</h3>
        </div>
        <p className="text-muted-foreground">
          {isLandlord ? EMPTY_STATE_MESSAGES.LANDLORD : EMPTY_STATE_MESSAGES.TENANT}
        </p>
      </CardContent>
    </Card>
  );
}