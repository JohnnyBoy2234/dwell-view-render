import { useState, useEffect } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ViewingPreScreeningForm from '@/components/viewing/ViewingPreScreeningForm';
import { format } from 'date-fns';

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
          .eq('tenant_id', user.id)
          .eq('landlord_id', landlordId)
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

  const handleStartConversation = async () => {
    if (!user) {
      const currentPath = window.location.pathname;
      sessionStorage.setItem('returnTo', currentPath);
      navigate('/auth');
      return;
    }
    
    // Show pre-screening form for first message
    if (isFirstMessage) {
      setShowPreScreening(true);
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

    // For subsequent messages, create conversation normally
    setLoading(true);
    try {
      const conversation = await createConversation({
        propertyId,
        landlordId,
        tenantId: user.id,
        inquiryId
      });

      if (conversation) {
        navigate(`/messages?c=${conversation.id}`);
        toast({
          title: "Conversation started",
          description: `You can now message about ${propertyTitle}`
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

  const handlePreScreeningSubmit = async (formData: any) => {
    setLoading(true);
    
    try {
      const rentalHistoryLabels = {
        clean: 'No, I have a clean rental history',
        late: 'Yes, I have been late on rent before',
        evicted: 'Yes, I have been evicted before',
        first_time: 'This is my first rental'
      };

      const preScreeningMessage = `${formData.message}

📋 Pre-Screening Information:
📅 Desired Move-in Date: ${format(formData.moveInDate, 'PPP')}
💰 Monthly Income: R${parseInt(formData.monthlyIncome).toLocaleString()}
🏠 Rental History: ${rentalHistoryLabels[formData.rentalHistory as keyof typeof rentalHistoryLabels]}

I look forward to viewing the property!`;

      const conversation = await createConversation({
        propertyId,
        landlordId,
        tenantId: user!.id,
        inquiryId,
        initialMessage: preScreeningMessage,
      });

      if (conversation) {
        navigate(`/messages?c=${conversation.id}`);
        toast({
          title: "Viewing request sent",
          description: "Your pre-screening information has been sent to the landlord."
        });
      }
    } catch (error) {
      console.error('Error submitting pre-screening:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send viewing request. Please try again."
      });
    } finally {
      setLoading(false);
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Calendar className="h-4 w-4 mr-2" />
          Request Viewing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Viewing</DialogTitle>
          <DialogDescription>
            {showPreScreening 
              ? "Please fill out some information to help the landlord" 
              : `Start a conversation with the landlord about "${propertyTitle}"`
            }
          </DialogDescription>
        </DialogHeader>
        
        {showPreScreening ? (
          <ViewingPreScreeningForm
            propertyAddress={propertyTitle}
            onSubmit={handlePreScreeningSubmit}
            onCancel={() => {
              setShowPreScreening(false);
              setOpen(false);
            }}
            loading={loading}
          />
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}