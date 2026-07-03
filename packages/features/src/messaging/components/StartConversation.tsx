import { useState, useEffect, type ReactNode } from 'react';
import { useMessaging } from '@mzanzihomes/supabase/hooks/useMessaging';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { Button } from '@mzanzihomes/ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Calendar, Send, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { formatPreScreeningMessage, type PreScreeningData } from '@mzanzihomes/common/types/message';

interface StartConversationProps {
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  inquiryId?: string;
  onConversationCreated?: () => void;
  // ponytail: pre-screening form injected by the app (lattice: no messaging->viewing edge)
  renderPreScreening?: (args: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (formData: PreScreeningData) => void;
    loading: boolean;
    propertyTitle: string;
  }) => ReactNode;
  // Custom trigger (e.g. a compact button for a mobile action bar); defaults to the full-width button below
  renderTrigger?: (onClick: () => void) => ReactNode;
}

export default function StartConversation({
  propertyId,
  landlordId,
  propertyTitle,
  inquiryId,
  onConversationCreated,
  renderPreScreening,
  renderTrigger,
}: StartConversationProps) {
  const { user } = useAuth();
  const { createConversation, sendMessage } = useMessaging();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPreScreening, setShowPreScreening] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if this is the first message to this landlord
  useEffect(() => {
    const checkFirstMessage = async () => {
      if (!user || !landlordId) return;
      
      console.log('🔍 Checking for existing conversations:', { userId: user.id, landlordId });
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id')
          .eq('tenant_id', user.id as any)
          .eq('landlord_id', landlordId as any)
          .limit(1);
          
        if (error) {
          console.error('❌ Error checking existing conversations:', error);
          return;
        }
        
        console.log('✅ Existing conversations check result:', { data, count: data?.length });
        setIsFirstMessage(!data || data.length === 0);
      } catch (error) {
        console.error('❌ Error checking first message:', error);
      }
    };
    
    checkFirstMessage();
  }, [user, landlordId]);

  const handleRequestViewingClick = () => {
    console.log('🔵 Request Viewing clicked', { user, landlordId, isFirstMessage, showPreScreening, open });
    
    if (!user) {
      console.log('🔴 No user, navigating to auth');
      navigate('/auth');
      return;
    }
    
    if (user.id === landlordId) {
      console.log('🔴 User is landlord, showing error');
      toast({
        variant: "destructive",
        title: "Cannot message yourself",
        description: "You cannot start a conversation with yourself."
      });
      return;
    }
    
    // Route to appropriate dialog based on first message status
    console.log('🟢 Routing to dialog', { isFirstMessage });
    if (isFirstMessage) {
      console.log('🟢 Setting showPreScreening to true');
      setShowPreScreening(true);
    } else {
      console.log('🟢 Setting open to true');
      setOpen(true);
    }
  };

  const handleStartConversation = async () => {
    // This is now only called for NON-first-time messages
    setLoading(true);
    
    try {
      console.log('Creating conversation with:', { propertyId, landlordId, userId: user.id, inquiryId });
      const conversation = await createConversation(
        propertyId,
        landlordId,
        user!.id,
        inquiryId
      );

      console.log('Conversation created:', conversation);
      if (conversation && 'id' in conversation) {
        console.log('Navigating to:', `/messages?c=${conversation.id}`);
        navigate(`/messages?c=${conversation.id}`);
        onConversationCreated?.();
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

  const handlePreScreeningSubmit = async (formData: PreScreeningData) => {
    setLoading(true);
    
    try {
      // Create conversation first
      console.log('Creating conversation with:', { propertyId, landlordId, userId: user.id, inquiryId });
      const conversation = await createConversation(
        propertyId,
        landlordId,
        user!.id,
        inquiryId
      );

      if (conversation && 'id' in conversation) {
        // Format and send the pre-screening message
        const preScreeningMessage = formatPreScreeningMessage(formData, propertyTitle);
        await sendMessage(conversation.id as string, preScreeningMessage);
        
        // Navigate to messages page
        console.log('Navigating to:', `/messages?c=${conversation.id}`);
        navigate(`/messages?c=${conversation.id}`);
        onConversationCreated?.();
        
        toast({
          title: "Viewing request sent!",
          description: "The landlord will review your information and respond soon."
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
      console.error('Error sending viewing request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send viewing request. Please try again."
      });
    } finally {
      setLoading(false);
      setShowPreScreening(false);
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
    <>
      {renderTrigger ? (
        renderTrigger(handleRequestViewingClick)
      ) : (
        <Button className="w-full" onClick={handleRequestViewingClick}>
          <Calendar className="h-4 w-4 mr-2" />
          Request Viewing
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Viewing</DialogTitle>
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
                    Request Viewing
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {renderPreScreening?.({
        open: showPreScreening,
        onOpenChange: setShowPreScreening,
        onSubmit: handlePreScreeningSubmit,
        loading,
        propertyTitle,
      })}
    </>
  );
}