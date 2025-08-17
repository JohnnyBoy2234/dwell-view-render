import { useState } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface StartConversationProps {
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  inquiryId?: string;
}

export default function StartConversation({ 
  propertyId, 
  landlordId, 
  propertyTitle, 
  inquiryId 
}: StartConversationProps) {
  const { user } = useAuth();
  const { createConversation } = useMessaging();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartConversation = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (user.id === landlordId) {
      toast({
        variant: "destructive",
        title: "Cannot message yourself",
        description: "You cannot start a conversation with yourself."
      });
      return;
    }

    setLoading(true);
    
    try {
      const conversation = await createConversation(
        propertyId,
        landlordId,
        user.id,
        inquiryId
      );

      if (conversation) {
        navigate('/messages');
        toast({
          title: "Conversation started",
          description: `You can now message about ${propertyTitle}`
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  if (!user) {
    return (
      <Button onClick={() => navigate('/auth')} className="w-full">
        <MessageCircle className="h-4 w-4 mr-2" />
        Sign in to Message
      </Button>
    );
  }

  if (user.id === landlordId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <MessageCircle className="h-4 w-4 mr-2" />
          Message Landlord
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Conversation</DialogTitle>
          <DialogDescription>
            Start a conversation with the landlord about "{propertyTitle}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will create a new conversation thread where you can discuss property details, 
            schedule viewings, and ask questions directly with the landlord.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartConversation} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Start Conversation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}