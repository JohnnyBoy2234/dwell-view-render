import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/maintenance/messaging/MessageBubble';
import { MessageComposer } from '@/components/maintenance/messaging/MessageComposer';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ViewingProposalCard } from '@/components/messaging/ViewingProposalCard';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { cn } from '@/lib/utils';
import { Clock, Check, CheckCheck } from 'lucide-react';
import React from 'react';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_by_landlord?: boolean;
  read_by_tenant?: boolean;
  profiles?: { display_name: string } | null;
  optimistic?: boolean;
  message_type?: string | null;
  attachment_url?: string | null;
  viewing_proposal_id?: string | null;
  tempId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface WhatsAppStyleThreadProps {
  conversationId: string;
  onMessageSent?: () => void;
  onScrollToProposal?: (fn: (proposalId: string) => void) => void;
  onCreateViewing?: () => void;
  isLandlordInConversation?: boolean;
}

interface MessageStatusIndicatorProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  className?: string;
}

function MessageStatusIndicator({ status, className }: MessageStatusIndicatorProps) {
  const base = 'h-3 w-3';
  const iconClass = cn(base, className);
  switch (status) {
    case 'sending':
      return <Clock className={`${iconClass} text-white/60`} aria-label="Sending" />;
    case 'sent':
      return <Check className={`${iconClass} text-white/80`} aria-label="Sent" />;
    case 'delivered':
      return <CheckCheck className={`${iconClass} text-white`} aria-label="Delivered" />;
    case 'read':
      return <CheckCheck className={`${iconClass} text-success-green`} aria-label="Read" />;
    case 'failed':
      return <Clock className={`${iconClass} text-red-400`} aria-label="Failed" />;
    default:
      return null;
  }
}

export function WhatsAppStyleThread({ conversationId, onMessageSent, onScrollToProposal, onCreateViewing, isLandlordInConversation }: WhatsAppStyleThreadProps) {
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [proposalsById, setProposalsById] = useState<Record<string, any>>({});

  const {
    messages,
    loading,
    connectionStatus,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    setActiveConversation,
    markMessagesAsRead
  } = useWhatsAppMessaging();

  // Load messages when conversation changes - useMessaging handles this automatically
  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      
      // Mark messages as read when opening the conversation
      setTimeout(() => {
        if (markMessagesAsRead) {
          console.log('📖 WhatsApp Thread: Marking messages as read for conversation:', conversationId);
          markMessagesAsRead(conversationId);
        }
      }, 1000);
    }
  }, [conversationId, setActiveConversation, markMessagesAsRead]);

  // Auto-scroll to bottom when new messages arrive or when typing
  const scrollToBottom = (force = false) => {
    if (force || isScrolledToBottom) {
      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Use requestAnimationFrame for better DOM timing
        requestAnimationFrame(() => {
          (scrollContainer as any).scrollTop = (scrollContainer as any).scrollHeight;
        });
      } else {
        // Fallback to scrollIntoView with better positioning
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  };

  // Handle all scroll-to-bottom scenarios in one effect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      timeoutId = setTimeout(() => {
        // Force scroll for new conversation or if we're at bottom
        const isNewConversation = messages.length === 1;
        scrollToBottom(isNewConversation);
      }, 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messages.length, conversationId]);

  // Force scroll to latest message when opening conversation
  useEffect(() => {
    if (conversationId && !loading) {
      // Always scroll to bottom when switching conversations
      const timeoutId = setTimeout(() => scrollToBottom(true), 200);
      return () => clearTimeout(timeoutId);
    }
  }, [conversationId, loading]);

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
      try {
        console.log('📋 Loading viewing proposals:', missingIds);
        const { data, error } = await supabase
          .from('viewing_proposals')
          .select(`*, properties ( title, location )`)
          .in('id', missingIds as any);
        
        if (error) {
          console.error('Error loading viewing proposals:', error);
          return;
        }
        
        if (data) {
          console.log('📋 Loaded viewing proposals:', data.length);
          setProposalsById(prev => {
            const next = { ...prev };
            data.forEach(p => { next[p.id] = p; });
            return next;
          });
        }
      } catch (error) {
        console.error('Failed to load viewing proposals:', error);
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

  // Improved scroll position tracking with debouncing
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleScrollPositionUpdate = (viewport: Element) => {
    const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20; // 20px threshold for better UX
    
    if (isAtBottom !== isScrolledToBottom) {
      setIsScrolledToBottom(isAtBottom);
    }
  };

  // Real-time scroll behavior for new messages
  const previousMessageCount = useRef(messages.length);
  const lastMessageId = useRef<string | null>(null);
  
  useEffect(() => {
    const currentMessageCount = messages.length;
    const latestMessage = messages[messages.length - 1];
    
    // Check if we have a new message (not just initial load)
    if (currentMessageCount > previousMessageCount.current && latestMessage && latestMessage.id !== lastMessageId.current) {
      console.log('📝 New message detected, auto-scrolling');
      
      // Always scroll for own messages, smart scroll for others
      const isOwnMessage = latestMessage.sender_id === user?.id;
      
      if (isOwnMessage) {
        // Always scroll for own messages
        setTimeout(() => scrollToBottom(true), 50);
      } else if (isScrolledToBottom) {
        // Only scroll for others' messages if user is at bottom
        setTimeout(() => scrollToBottom(), 50);
      }
      
      lastMessageId.current = latestMessage.id;
    }
    
    previousMessageCount.current = currentMessageCount;
  }, [messages, user?.id, isScrolledToBottom]);

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

    // Stop typing indicator
    sendTypingIndicator(conversationId, false);
    
    setNewMessage('');
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await sendMessage(conversationId, trimmed, files || []);
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
    
    // Send typing indicators
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(conversationId, true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
      sendTypingIndicator(conversationId, false);
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(conversationId, true);
    }
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicator(conversationId, false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.sender_id === user?.id;
    const messageStatus = message.status || (isOwn 
      ? (isLandlord 
          ? (message.read_by_tenant ? 'read' : 'delivered')
          : (message.read_by_landlord ? 'read' : 'delivered'))
      : 'delivered');

    const showNewDayDivider = index === 0 ||
      new Date(message.created_at).toDateString() !== new Date(messages[index - 1]?.created_at || 0).toDateString();

    const showTimeGap = index === 0 ||
      new Date(message.created_at).getTime() - new Date(messages[index - 1]?.created_at || 0).getTime() > 300000; // 5 minutes

    const messageKey = message.id;

    const hasAttachment = message.message_type === 'attachment' && message.attachment_url;

    const bubbleElement = (
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

          {hasAttachment && (
            <div className="mb-2">
              <a
                href={message.attachment_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-medium"
              >
                <span className="truncate max-w-[200px]">Attachment</span>
                <span className="text-[10px] text-white/60">Open</span>
              </a>
            </div>
          )}

          {message.content && (
            <div className="text-sm leading-relaxed whitespace-pre-line break-words">
              {message.content}
            </div>
          )}

          <div className={cn(
            'mt-2 flex items-center gap-1 text-[11px]',
            isOwn ? 'flex-row-reverse text-white/70' : 'text-ios-gray'
          )}>
            <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isOwn && (
                <MessageStatusIndicator 
                  status={messageStatus}
                  className={cn(
                    'transition-colors duration-200',
                    messageStatus === 'read' ? 'text-green-400' : 'text-white/70'
                  )}
                />
            )}
          </div>
        </div>
      </div>
    );

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
        {proposalsById[message.viewing_proposal_id] ? (
          <ViewingProposalCard
            proposal={proposalsById[message.viewing_proposal_id]}
            onUpdate={onCreateViewing}
            isLandlordInConversation={!!isLandlordInConversation}
          />
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading viewing proposal...</p>
              </div>
            )}
          </div>
        ) : (
          bubbleElement
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
        onScrollCapture={(e) => {
          const viewport = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
          if (viewport) {
            // Debounce scroll position updates for better performance
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
              handleScrollPositionUpdate(viewport);
            }, 50);
          }
        }}
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
            <>
              {messages.map(renderMessage)}
              
              {/* Show typing indicator */}
              {Array.from(typingUsers.entries())
                .filter(([userId, convId]) => convId === conversationId && userId !== user?.id)
                .length > 0 && (
                <TypingIndicator 
                  userNames={Array.from(typingUsers.entries())
                    .filter(([userId, convId]) => convId === conversationId && userId !== user?.id)
                    .map(([userId]) => 'User')} // You could map to actual names if you have them
                  className="mb-2"
                />
              )}
            </>
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