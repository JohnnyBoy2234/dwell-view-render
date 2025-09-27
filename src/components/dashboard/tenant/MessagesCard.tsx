import * as React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { useNavigate } from 'react-router-dom';

interface MessagesCardProps {
  unreadCount: number;
}

export function MessagesCard({ unreadCount }: MessagesCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover-scale cursor-pointer shadow-medium border-ocean-blue/20 bg-gradient-to-br from-white to-success-green-light/30 animate-fade-in" onClick={() => navigate('/tenant-dashboard/messages')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-success-green" />
            {unreadCount > 0 && (
              <NotificationBadge 
                count={unreadCount} 
                className="bg-earth-warm text-white"
              />
            )}
          </div>
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4">
          {unreadCount > 0 ? (
            <>
              <div className="text-2xl font-bold text-success-green mb-2">
                {unreadCount}
              </div>
              <p className="text-muted-foreground mb-4">
                {unreadCount === 1 ? 'New message' : 'New messages'}
              </p>
            </>
          ) : (
            <>
              <MessageSquare className="h-12 w-12 text-success-green mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No new messages</p>
            </>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-success-green hover:bg-success-green/10"
          >
            View Messages
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}