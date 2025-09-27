import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/maintenance/messaging/MessageBubble';
import { MessageComposer } from '@/components/maintenance/messaging/MessageComposer';
import { useMessageCache } from '@/hooks/useMessageCache';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ViewingProposalCard } from '@/components/messaging/ViewingProposalCard';
import { cn } from '@/lib/utils';
import { Clock, Check, CheckCheck } from 'lucide-react';
import React from 'react'; // Added missing import

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_by_landlord: boolean;
  read_by_tenant: boolean;
  profiles?: { display_name: string } | null;
  optimistic?: boolean;
  message_type?: string | null;
  attachment_url?: string | null;
}

interface WhatsAppStyleThreadProps {
  conversationId: string;
  onMessageSent?: () => void;
  onScrollToProposal?: (fn: (proposalId: string) => void) => void;
  onCreateViewing?: () => void;
}

export function WhatsAppStyleThread({ conversationId, onMessageSent, onScrollToProposal, onCreateViewing }: WhatsAppStyleThreadProps) {
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [proposalsById, setProposalsById] = useState<Record<string, any>>({});

  const {
    getMessages,
    addOptimisticMessage,
    confirmMessage,
    addRealtimeMessage,
    getCachedMessages,
    isLoading
  } = useMessageCache();

  const messages = getCachedMessages(conversationId);
  const loading = isLoading(conversationId);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      getMessages(conversationId);
    }
  }, [conversationId, getMessages]);

  // Auto-scroll to bottom when new messages arrive or when typing
  const scrollToBottom = (force = false) => {
    if (force || isScrolledToBottom) {
      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Use scrollTop method for more reliable bottom positioning
        setTimeout(() => {
          (scrollContainer as any).scrollTop = (scrollContainer as any).scrollHeight;
        }, 50);
      } else {
        // Fallback to scrollIntoView with better positioning
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [messages.length]);

  // Auto-scroll to bottom when conversation changes (initial load)
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      // Force scroll to bottom when opening a new conversation
      setTimeout(() => scrollToBottom(true), 150);
    }
  }, [conversationId]);

  // Load viewing proposals referenced by messages
  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        messages
          .filter(m => m.viewing_proposal_id)
          .map(m => m.viewing_proposal_id as string)
      )
    ).filter(id => !proposalsById[id]);

    if (missingIds.length === 0) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('viewing_proposals')
        .select(`*, properties ( title, location )`)
        .in('id', missingIds as any);
      if (!error && data) {
        setProposalsById(prev => {
          const next = { ...prev };
          data.forEach(p => { next[p.id] = p; });
          return next;
        });
      }
    };
    load();
  }, [messages, proposalsById]);

  // Scroll to specific proposal (called from reminder header)
  const scrollToProposal = (proposalId: string) => {
    const anchor = document.getElementById(`proposal-${proposalId}`);
    if (anchor && scrollAreaRef.current) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Offset for fixed header
      setTimeout(() => {
        try {
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            (scrollContainer as any).scrollTop = (scrollContainer as any).scrollTop - 80;
          }
        } catch {}
      }, 200);
    }
  };

  // Support external scroll-to events from header sticky bar
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>;
      scrollToProposal(ce.detail.id);
    };
    window.addEventListener('scroll-to-proposal', handler as EventListener);
    return () => window.removeEventListener('scroll-to-proposal', handler as EventListener);
  }, []);

  // Expose scroll function to parent
  const handleScrollToProposal = (fn: (id: string) => void) => {
    // Store the function reference for later use
    if (onScrollToProposal) {
      onScrollToProposal(fn);
    }
  };

  useEffect(() => {
    handleScrollToProposal(scrollToProposal);
  }, [onScrollToProposal]);

  // Handle scroll position tracking
  const handleScroll = (event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    setIsScrolledToBottom(isAtBottom);
  };

  // Real-time message subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          addRealtimeMessage(newMsg);
          
          // Auto-scroll for new messages
          setTimeout(() => scrollToBottom(true), 100);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          addRealtimeMessage(updatedMsg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, addRealtimeMessage]);

  // Real-time viewing proposals subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`viewing-proposals-${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'viewing_proposals',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log('🔔 Viewing proposal change:', payload);
          
          // Refresh the proposal data when status changes
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const proposalId = payload.new?.id;
            if (proposalId) {
              try {
                const { data, error } = await supabase
                  .from('viewing_proposals')
                  .select(`*, properties ( title, location )`)
                  .eq('id', proposalId)
                  .single();
                
                if (!error && data) {
                  setProposalsById(prev => ({
                    ...prev,
                    [proposalId]: data
                  }));
                }
              } catch (error) {
                console.error('Error refetching proposal:', error);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Handle sending messages
  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!user) return;
    const trimmed = content.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    const tempId = addOptimisticMessage(conversationId, {
      sender_id: user.id,
      content: trimmed,
      profiles: null,
    });

    setNewMessage('');
    setTimeout(() => scrollToBottom(true), 50);

    try {
      let attachmentUrl: string | null = null;

      if (files && files.length > 0) {
        const file = files[0];
        const ext = file.name.split('.').pop();
        const path = `messages/${conversationId}/${user.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const storedPath = uploadData?.path || path;
        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(storedPath);
        attachmentUrl = publicUrlData?.publicUrl || storedPath;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: trimmed,
          message_type: attachmentUrl ? 'attachment' : 'text',
          attachment_url: attachmentUrl,
        })
        .select()
        .single();

      if (error) throw error;

      confirmMessage(conversationId, tempId, data as Message);

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      onMessageSent?.();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: 'Please try again',
      });
    }
  };

  // Handle input focus for mobile keyboard
  const handleComposerFocus = () => {
    // Scroll to bottom when keyboard opens on mobile
    setTimeout(() => scrollToBottom(true), 300);
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    if (value.length > 0) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  };

  const handleTypingStart = () => {
    setIsTyping(true);
  };

  const handleTypingStop = () => {
    setIsTyping(false);
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.sender_id === user?.id;
    const isRead = isOwn ? (isLandlord ? message.read_by_tenant : message.read_by_landlord) : (isLandlord ? message.read_by_landlord : message.read_by_tenant);
    const statusType = isOwn
      ? isLandlord
        ? (message.read_by_tenant ? 'read' : 'delivered')
        : (message.read_by_landlord ? 'read' : 'delivered')
      : 'none';

    const showNewDayDivider = index === 0 ||
      new Date(message.created_at).toDateString() !== new Date(messages[index - 1]?.created_at || 0).toDateString();

    const showTimeGap = index === 0 ||
      new Date(message.created_at).getTime() - new Date(messages[index - 1]?.created_at || 0).getTime() > 300000; // 5 minutes

    const messageKey = message.id;

    return (
      <React.Fragment key={messageKey}>
        {showNewDayDivider && (
          <div className="flex justify-center my-3">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/80 text-ios-gray-dark shadow-soft">
              {new Date(message.created_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        )}

        {message.message_type === 'viewing_proposal' && message.viewing_proposal_id ? (
          <div id={`proposal-${message.viewing_proposal_id}`} className="max-w-[95%] sm:max-w-[85%] mx-auto animate-message-incoming">
            <ViewingProposalCard
              message={message}
              proposal={proposalsById[message.viewing_proposal_id]}
              onCreateViewing={onCreateViewing}
            />
          </div>
        ) : (
          <div
            className={cn(
              'flex items-end gap-2 mb-1',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'relative max-w-[95%] sm:max-w-[70%] rounded-3xl px-4 py-3 shadow-soft transition-transform',
                'backdrop-blur-sm border border-white/20',
                isOwn
                  ? 'bg-gradient-to-br from-ocean-blue to-ocean-blue-dark text-white animate-message-outgoing'
                  : 'bg-white/90 text-ios-gray-dark animate-message-incoming'
              )}
            >
              {(!isOwn && message.profiles?.display_name) && (
                <div className="text-xs font-semibold text-ios-blue mb-1 tracking-tight">
                  {message.profiles.display_name}
                </div>
              )}

              <div className="text-sm leading-relaxed whitespace-pre-line break-words">
                {message.content}
              </div>

              <div className={cn(
                'mt-2 flex items-center gap-1 text-[11px]',
                isOwn ? 'flex-row-reverse text-white/70' : 'text-ios-gray'
              )}>
                <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isOwn && (
                  <span
                    className={cn(
                      'inline-flex items-center transition-colors duration-200',
                      statusType === 'read' ? 'text-success-green-light' : 'text-white/70'
                    )}
                  >
                    {statusType === 'read' ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {showTimeGap && index !== messages.length - 1 && (
          <div className="py-1" aria-hidden="true"></div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Messages Area */}
      <ScrollArea 
        className="flex-1 px-4" 
        ref={scrollAreaRef}
        onScroll={handleScroll}
      >
        <div
          className="py-4 space-y-1"
          style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Show scroll to bottom button when not at bottom */}
      {!isScrolledToBottom && messages.length > 0 && (
        <div className="absolute bottom-20 right-4 z-10">
          <button
            onClick={() => scrollToBottom(true)}
            className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-all"
          >
            ↓
          </button>
        </div>
      )}

      {/* Message Input */}
      <div
        className="p-4 bg-background/95 backdrop-blur border-t sticky bottom-0 z-10 flex-shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <MessageComposer
          onSend={handleSendMessage}
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleMessageChange}
          onFocus={handleComposerFocus}
          autoFocus={false}
          onCreateViewing={onCreateViewing}
          showViewingButton={!!onCreateViewing}
        />
      </div>
    </div>
  );
}