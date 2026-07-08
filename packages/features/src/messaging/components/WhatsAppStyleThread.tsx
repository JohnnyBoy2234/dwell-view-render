import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageComposer } from '@mzanzihomes/ui/components/messaging/MessageComposer';
import { useWhatsAppMessaging } from '../hooks/useWhatsAppMessaging';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { TypingIndicator } from '@mzanzihomes/ui/components/messaging/TypingIndicator';
import { MessageContent } from '@mzanzihomes/ui/components/messaging/MessageContent';
import { MessageAttachment } from '@mzanzihomes/ui/components/messaging/MessageAttachment';
import { cn } from '@mzanzihomes/common/lib/utils';
import { Clock, Check, CheckCheck, ChevronDown } from 'lucide-react';
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
  tenantId?: string;
  propertyId?: string;
  // ponytail: viewing-proposal card injected by the app (lattice: no messaging->viewing edge)
  renderViewingProposal?: (args: {
    proposal: unknown;
    onUpdate?: () => void;
    isLandlordInConversation: boolean;
  }) => React.ReactNode;
}

// ─── Status indicator ────────────────────────────────────────────────────────

function MessageStatusIndicator({
  status,
  className,
}: {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  className?: string;
}) {
  const base = 'h-[11px] w-[11px]';
  const cls = cn(base, className);
  switch (status) {
    case 'sending':
      return <Clock className={cn(cls, 'text-white/50')} aria-label="Sending" />;
    case 'sent':
      return <Check className={cn(cls, 'text-white/70')} aria-label="Sent" />;
    case 'delivered':
      return <CheckCheck className={cn(cls, 'text-white/85')} aria-label="Delivered" />;
    case 'read':
      return <CheckCheck className={cn(cls, 'text-emerald-300')} aria-label="Read" />;
    case 'failed':
      return <Clock className={cn(cls, 'text-red-400')} aria-label="Failed" />;
    default:
      return null;
  }
}

// ─── Bubble tail SVGs ─────────────────────────────────────────────────────────

// Outgoing tail: bottom-right, matches gradient end colour
function OutgoingTail() {
  return (
    <svg
      className="absolute bottom-0 -right-[7px]"
      width="9"
      height="12"
      viewBox="0 0 9 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M0 12 L0 0 Q9 8 9 12 Z" fill="hsl(214,100%,49%)" />
    </svg>
  );
}

// Incoming tail: bottom-left, white
function IncomingTail() {
  return (
    <svg
      className="absolute bottom-0 -left-[7px]"
      width="9"
      height="12"
      viewBox="0 0 9 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M9 12 L9 0 Q0 8 0 12 Z" fill="white" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WhatsAppStyleThread({
  conversationId,
  onMessageSent,
  onScrollToProposal,
  onCreateViewing,
  isLandlordInConversation,
  tenantId,
  propertyId,
  renderViewingProposal,
}: WhatsAppStyleThreadProps) {
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [proposalsById, setProposalsById] = useState<Record<string, any>>({});
  // Show skeletons immediately — start as true so first render never flashes empty content
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Track which message IDs are "initial" for stagger animation
  const initialMsgIdsRef = useRef<Set<string>>(new Set());
  const prevConvIdRef = useRef<string | null>('__none__');
  // Track newly sent own message IDs for spring pop
  const newlyAddedIdsRef = useRef<Set<string>>(new Set());

  const {
    messages,
    loading,
    connectionStatus,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    setActiveConversation,
    markMessagesAsRead,
  } = useWhatsAppMessaging();

  // Reset stagger tracking on conversation switch + immediately show skeletons
  useEffect(() => {
    if (conversationId !== prevConvIdRef.current) {
      initialMsgIdsRef.current = new Set();
      newlyAddedIdsRef.current = new Set();
      prevConvIdRef.current = conversationId;
      setIsTransitioning(true);
    }
  }, [conversationId]);

  // Clear transitioning once messages are available
  useEffect(() => {
    if (!loading && messages.length > 0 && isTransitioning) {
      setIsTransitioning(false);
    }
  }, [loading, messages.length, isTransitioning]);

  // Mark first batch of messages as "initial" once loaded
  useEffect(() => {
    if (!loading && messages.length > 0 && initialMsgIdsRef.current.size === 0) {
      messages.forEach(m => initialMsgIdsRef.current.add(m.id));
    }
  }, [loading, messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      setTimeout(() => {
        if (markMessagesAsRead) {
          markMessagesAsRead(conversationId);
        }
      }, 1000);
    }
  }, [conversationId, setActiveConversation, markMessagesAsRead]);

  // Auto-scroll to bottom
  const scrollToBottom = (force = false) => {
    const viewport = scrollContainerRef.current;
    if (!viewport) return;
    const atBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 20;
    if (force || atBottom || isScrolledToBottom) {
      requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
        setIsScrolledToBottom(true);
      });
    }
  };

  useEffect(() => {
    let tid: NodeJS.Timeout;
    if (messages.length > 0) {
      tid = setTimeout(() => {
        scrollToBottom(messages.length === 1);
      }, 100);
    }
    return () => clearTimeout(tid);
  }, [messages.length, conversationId]);

  useEffect(() => {
    if (conversationId && !loading) {
      const tid = setTimeout(() => scrollToBottom(true), 200);
      return () => clearTimeout(tid);
    }
  }, [conversationId, loading]);

  // Scroll tracking
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleScrollPositionUpdate = (viewport: Element) => {
    const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 20;
    if (atBottom !== isScrolledToBottom) setIsScrolledToBottom(atBottom);
  };

  // Smart new-message scroll
  const previousMessageCount = useRef(messages.length);
  const lastMessageId = useRef<string | null>(null);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (
      messages.length > previousMessageCount.current &&
      latestMessage &&
      latestMessage.id !== lastMessageId.current
    ) {
      const isOwn = latestMessage.sender_id === user?.id;
      if (isOwn) {
        setTimeout(() => scrollToBottom(true), 50);
      } else if (isScrolledToBottom) {
        setTimeout(() => scrollToBottom(), 50);
      }
      lastMessageId.current = latestMessage.id;
    }
    previousMessageCount.current = messages.length;
  }, [messages, user?.id, isScrolledToBottom]);

  // Load viewing proposals
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
        const { data, error } = await supabase
          .from('viewing_proposals')
          .select(`*, properties ( title, location )`)
          .in('id', missingIds as any);
        if (error) return;
        if (data) {
          setProposalsById(prev => {
            const next = { ...prev };
            data.forEach((p: any) => { next[p.id] = p; });
            return next;
          });
        }
      } catch {}
    };
    load();
  }, [messages, proposalsById]);

  // Re-fetch one proposal's row after a decline/confirm mutation, since the
  // "load missing" effect above skips ids already in proposalsById and the
  // realtime subscription can lag.
  const refreshProposal = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('viewing_proposals')
        .select(`*, properties ( title, location )`)
        .eq('id', id as any)
        .maybeSingle();
      if (error || !data) return;
      setProposalsById(prev => ({ ...prev, [(data as any).id]: data }));
    } catch {}
  };

  // Scroll-to-proposal
  const scrollToProposal = (proposalId: string) => {
    const anchor = document.getElementById(`proposal-${proposalId}`);
    if (!anchor) return;
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    setTimeout(() => {
      scrollContainerRef.current?.scrollBy({ top: -80, behavior: 'smooth' });
    }, 200);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>;
      scrollToProposal(ce.detail.id);
    };
    window.addEventListener('scroll-to-proposal', handler as EventListener);
    return () => window.removeEventListener('scroll-to-proposal', handler as EventListener);
  }, []);

  useEffect(() => {
    if (onScrollToProposal) onScrollToProposal(scrollToProposal);
  }, [onScrollToProposal]);

  // Real-time viewing proposal subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`viewing-proposals-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viewing_proposals', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const proposalId = payload.new?.id;
            if (proposalId) {
              try {
                const { data, error } = await supabase
                  .from('viewing_proposals')
                  .select(`*, properties ( title, location )`)
                  .filter('id', 'eq', proposalId)
                  .single();
                if (!error && data) {
                  setProposalsById(prev => ({ ...prev, [proposalId]: data as any }));
                }
              } catch {}
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!user) return;
    const trimmed = content.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    sendTypingIndicator(conversationId, false);
    setNewMessage('');
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await sendMessage(conversationId, trimmed, files || []);
      onMessageSent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: 'Please try again',
      });
    }
  };

  const handleComposerFocus = () => {
    setTimeout(() => scrollToBottom(true), 300);
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(conversationId, true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
      sendTypingIndicator(conversationId, false);
    }
  };

  // ─── Render a single message ───────────────────────────────────────────────

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.sender_id === user?.id;
    const messageStatus: Message['status'] = message.status || (
      isOwn
        ? isLandlord
          ? message.read_by_tenant ? 'read' : 'delivered'
          : message.read_by_landlord ? 'read' : 'delivered'
        : 'delivered'
    );

    const showNewDayDivider =
      index === 0 ||
      new Date(message.created_at).toDateString() !==
        new Date(messages[index - 1]?.created_at || 0).toDateString();

    const showTimeGap =
      index === 0 ||
      new Date(message.created_at).getTime() -
        new Date(messages[index - 1]?.created_at || 0).getTime() >
        300_000; // 5 min

    const hasAttachment = message.message_type === 'attachment' && message.attachment_url;

    // Decide animation: staggered reveal for initial batch, spring pop for own new messages
    const isInitial = initialMsgIdsRef.current.has(message.id);
    const isNewOwn = isOwn && !isInitial;
    const staggerDelay = isInitial ? Math.min(index * 28, 380) : 0;

    const bubbleElement = (
      <div
        className={cn('flex items-end gap-2 mb-0.5', isOwn ? 'justify-end' : 'justify-start')}
      >
        <div
          className={cn(
            'relative w-fit max-w-[82%] md:max-w-[68%] px-3.5 py-2.5',
            'shadow-ios-sm',
            // Shape — no radius on tail side
            isOwn
              ? 'rounded-[20px] rounded-br-[6px] bg-gradient-to-br from-ocean-blue to-ocean-blue-dark text-white'
              : 'rounded-[20px] rounded-bl-[6px] bg-white text-ios-gray-dark',
            // Animation
            isNewOwn
              ? 'animate-msg-spring-pop'
              : isOwn
              ? 'animate-message-outgoing'
              : 'animate-msg-slide-in'
          )}
          style={{
            wordBreak: 'break-word',
            animationDelay: isInitial ? `${staggerDelay}ms` : '0ms',
            animationFillMode: 'backwards',
          }}
        >
          {/* Sender name (incoming only, group context) */}
          {!isOwn && message.profiles?.display_name && (
            <div className="text-[11px] font-semibold text-ocean-blue mb-0.5 tracking-tight">
              {message.profiles.display_name}
            </div>
          )}

          {/* Attachment */}
          {hasAttachment && (
            <div className="mb-2">
              <MessageAttachment url={message.attachment_url!} />
            </div>
          )}

          {/* Message text */}
          {message.content && (
            <div
              className="text-[14.5px] leading-[1.45] whitespace-pre-line break-words hyphens-auto"
              style={{ overflowWrap: 'anywhere' }}
            >
              <MessageContent content={message.content} isOwn={isOwn} isLandlord={isLandlord} />
            </div>
          )}

          {/* Timestamp + status */}
          <div
            className={cn(
              'flex items-center justify-end gap-1 mt-1',
              isOwn ? 'text-white/60' : 'text-ios-gray/70'
            )}
          >
            <span className="text-[10.5px] font-medium tabular-nums">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isOwn && (
              <MessageStatusIndicator
                status={messageStatus}
                className={cn(messageStatus === 'read' && 'text-emerald-300')}
              />
            )}
          </div>

          {/* Application invite CTA */}
          {!isOwn &&
            !isLandlordInConversation &&
            typeof message.content === 'string' &&
            message.content.includes('/apply/invite/') && (
              <div className="mt-2.5">
                <button
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-ocean-blue text-white hover:bg-ocean-blue-dark active:scale-95 transition-all shadow-ios-xs"
                  onClick={async () => {
                    try {
                      const match = message.content.match(/\/apply\/invite\/([a-zA-Z0-9-]+)/);
                      if (match?.[1]) {
                        const token = match[1];
                        const { data: invite, error } = await (supabase as any)
                          .from('application_invites')
                          .select('id, property_id, landlord_id')
                          .eq('token', token)
                          .maybeSingle();
                        if (error || !invite) {
                          toast({ title: 'Error', description: 'Could not load invite.', variant: 'destructive' });
                          return;
                        }
                        navigate(`/rental-application/${invite.property_id}?landlord=${invite.landlord_id}&invite=${invite.id}`);
                      }
                    } catch {
                      toast({ title: 'Error', description: 'Failed to start application.', variant: 'destructive' });
                    }
                  }}
                  aria-label="Start rental application"
                >
                  Start Application →
                </button>
              </div>
            )}

          {/* Bubble tail */}
          {isOwn ? <OutgoingTail /> : <IncomingTail />}
        </div>
      </div>
    );

    return (
      <React.Fragment key={message.id}>
        {showNewDayDivider && (
          <div className="flex justify-center my-4">
            <span className="px-3 py-1 text-[11px] font-semibold rounded-full bg-black/8 text-ios-gray-dark backdrop-blur-sm">
              {new Date(message.created_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        {message.message_type === 'viewing_proposal' && message.viewing_proposal_id ? (
          <div
            id={`proposal-${message.viewing_proposal_id}`}
            className="max-w-[95%] sm:max-w-[85%] mx-auto animate-message-incoming"
          >
            {proposalsById[message.viewing_proposal_id] ? (
              renderViewingProposal?.({
                proposal: proposalsById[message.viewing_proposal_id],
                onUpdate: () => refreshProposal(message.viewing_proposal_id as string),
                isLandlordInConversation: !!isLandlordInConversation,
              })
            ) : (
              <div className="bg-white/80 rounded-2xl p-4 text-center shadow-ios-xs">
                <div className="h-5 w-5 border-2 border-ocean-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading viewing proposal…</p>
              </div>
            )}
          </div>
        ) : (
          bubbleElement
        )}

        {showTimeGap && index !== messages.length - 1 && (
          <div className="py-0.5" aria-hidden="true" />
        )}
      </React.Fragment>
    );
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        // Clean, calm background — pure light blue-tinted gray
        background: 'hsl(214, 22%, 96%)',
      }}
    >
      {/* Messages scroll area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.12) transparent' }}
        onScroll={e => {
          const viewport = e.currentTarget;
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = setTimeout(() => handleScrollPositionUpdate(viewport), 50);
        }}
      >
        <div
          className="px-3 pt-3 pb-2 space-y-0.5 min-h-full flex flex-col justify-end"
        >
          {(loading || isTransitioning) ? (
            <div className="flex flex-col gap-2.5 pt-4">
              {/* Shimmer bubble skeletons — mimic real conversation shape */}
              {([
                { own: false, lines: 2, widthPct: 62 },
                { own: true,  lines: 1, widthPct: 45 },
                { own: false, lines: 3, widthPct: 70 },
                { own: true,  lines: 2, widthPct: 55 },
                { own: false, lines: 1, widthPct: 38 },
                { own: true,  lines: 2, widthPct: 60 },
              ] as { own: boolean; lines: number; widthPct: number }[]).map((s, i) => (
                <div
                  key={i}
                  className={cn('flex items-end gap-2', s.own ? 'justify-end' : 'justify-start')}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <div
                    className={cn(
                      'relative overflow-hidden',
                      'rounded-[20px]',
                      s.own ? 'rounded-br-[6px]' : 'rounded-bl-[6px]',
                      'chat-skeleton'
                    )}
                    style={{ width: `${s.widthPct}%`, maxWidth: '78%' }}
                  >
                    {/* Invisible content to set height — mimics text lines + timestamp */}
                    <div className="px-3.5 py-2.5 opacity-0 pointer-events-none select-none">
                      {Array.from({ length: s.lines }).map((_, li) => (
                        <div key={li} className="h-[14px] mb-1 last:mb-0" />
                      ))}
                      <div className="h-[10px] mt-1.5 w-16 ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}

              {/* Typing indicator */}
              {(() => {
                const entries = Array.from(typingUsers.entries()).filter(
                  ([userId, convId]) => convId === conversationId && userId !== user?.id
                );
                if (entries.length === 0) return null;
                const names = entries.map(([id]) => {
                  const conv = messages.find(m => m.sender_id === id)?.profiles?.display_name;
                  return conv || 'Someone';
                });
                return <TypingIndicator userNames={names} className="mb-2 mt-1" />;
              })()}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      {!isScrolledToBottom && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom(true)}
          className={cn(
            'absolute bottom-[84px] right-4 z-10',
            'h-9 w-9 rounded-full flex items-center justify-center',
            'bg-white shadow-ios-md border border-black/8 text-ios-gray-dark',
            'hover:shadow-ios-lg active:scale-90 transition-all duration-150',
            'animate-badge-pop'
          )}
          aria-label="Scroll to latest"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {/* Composer */}
      <div
        className="px-3 pt-2 pb-2 bg-white/90 backdrop-blur-md border-t border-black/6 sticky bottom-0 z-10 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        <MessageComposer
          onSend={handleSendMessage}
          placeholder="Message…"
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
