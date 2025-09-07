import { useState, useEffect } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Send, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [showFirstMessageGuide, setShowFirstMessageGuide] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if this is the first message to this landlord
  useEffect(() => {
    const checkFirstMessage = async () => {
      if (!user || !landlordId) return;
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id')
          .eq('tenant_id', user.id)
          .eq('landlord_id', landlordId)
          .limit(1);
          
        if (error) {
          console.error('Error checking existing conversations:', error);
          return;
        }
        
        setIsFirstMessage(!data || data.length === 0);
      } catch (error) {
        console.error('Error checking first message:', error);
      }
    };
    
    checkFirstMessage();
  }, [user, landlordId]);

  const handleStartConversation = async () => {
    if (!user) {
      // Store current page to return after auth
      const currentPath = window.location.pathname;
      sessionStorage.setItem('returnTo', currentPath);
      navigate('/auth');
      return;
    }
    
    // Show first message guide if this is the first conversation
    if (isFirstMessage) {
      setShowFirstMessageGuide(true);
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
      console.log('Creating conversation with:', { propertyId, landlordId, userId: user.id, inquiryId });
      const conversation = await createConversation(
        propertyId,
        landlordId,
        user.id,
        inquiryId
      );

      console.log('Conversation created:', conversation);
      if (conversation) {
        console.log('Navigating to:', `/messages?c=${conversation.id}`);
        navigate(`/messages?c=${conversation.id}`);
        toast({
          title: "Conversation started",
          description: `You can now message about ${propertyTitle}`
        });
      } else {
        console.log('No conversation returned');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create conversation"
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start conversation. Please try again."
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleProceedWithMessage = async () => {
    setShowFirstMessageGuide(false);
    setLoading(true);
    
    try {
      const conversation = await createConversation(
        propertyId,
        landlordId,
        user.id,
        inquiryId
      );

      if (conversation) {
        navigate(`/messages?c=${conversation.id}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start conversation. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Button onClick={() => navigate('/auth')} className="w-full">
        <Calendar className="h-4 w-4 mr-2" />
        Sign in to Request Viewing
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
          <Calendar className="h-4 w-4 mr-2" />
          Request Viewing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Viewing</DialogTitle>
          <DialogDescription>
            Start a conversation with the landlord about "{propertyTitle}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isFirstMessage && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    How to request a viewing
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    To arrange a viewing, please suggest a few times that work for you in your message. 
                    The landlord will confirm the final time and date. Once agreed, you can formally request an application.
                  </p>
                </div>
              </div>
            </div>
          )}
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
                  Request Viewing
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}