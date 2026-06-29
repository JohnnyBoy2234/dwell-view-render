import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { EMPTY_STATE_MESSAGES } from '@mzanzihomes/common/constants/messagesConstants';

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
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground">
          {isLandlord ? EMPTY_STATE_MESSAGES.LANDLORD : EMPTY_STATE_MESSAGES.TENANT}
        </p>
      </CardContent>
    </Card>
  );
}