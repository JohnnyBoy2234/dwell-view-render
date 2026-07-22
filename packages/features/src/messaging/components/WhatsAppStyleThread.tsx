import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageComposer } from '@mzanzihomes/ui/components/messaging/MessageComposer';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { TypingIndicator } from '@mzanzihomes/ui/components/messaging/TypingIndicator';
import { MessageContent } from '@mzanzihomes/ui/components/messaging/MessageContent';
import { MessageAttachment } from '@mzanzihomes/ui/components/messaging/MessageAttachment';
import { cn } from '@mzanzihomes/common/lib/utils';
import { Message as MessageRow, MessageContent as MessageColumn } from '@mzanzihomes/ui/components/message';
import { CHAT_WALLPAPER_URL } from '../chatWallpaper';
import { Clock, Check, CheckCheck, ChevronDown, Reply as ReplyIcon, X } from 'lucide-react';
import { useMessageReactions, QUICK_REACTIONS } from '../hooks/useMessageReactions';
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
  reply_to_id?: string | null;
  viewing_proposal_id?: string | null;
  tempId?: string;
  // Stable key across the optimistic→server id swap (prevents remount/re-animation)
  clientKey?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface WhatsAppStyleThreadProps {
  conversationId: string;
  // Messaging state now owned by the parent (single `useWhatsAppMessaging`
  // instance) — this component used to call the hook itself, which meant
  // sending a message showed up instantly (optimistic update, same instance)
  // but anything the parent triggered on its own copy of the hook (e.g. a
  // viewing proposal created via an edge function) never reached the thread
  // that's actually on screen until a full page reload remounted everything.
  messages: Message[];
  loading: boolean;
  typingUsers: Map<string, string>;
  sendMessage: (conversationId: string, content: string, files?: File[], replyToId?: string) => Promise<void> | void;
  sendTypingIndicator: (conversationId: string, typing: boolean) => void;
  markMessagesAsRead: (conversationId: string) => Promise<void> | void;
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

// ─── Small helpers ────────────────────────────────────────────────────────────

// WhatsApp-style day label: Today / Yesterday / "Mon, 12 Jul" (year only if past).
function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

// Subtle haptic tick. Native haptics come via Capacitor on device; on the web
// layer the Vibration API is a no-op where unsupported (e.g. iOS Safari).
function vibrate(ms: number) {
  try { (navigator as any).vibrate?.(ms); } catch { /* unsupported */ }
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

// ─── Main component ───────────────────────────────────────────────────────────

export function WhatsAppStyleThread({
  conversationId,
  messages,
  loading,
  typingUsers,
  sendMessage,
  sendTypingIndicator,
  markMessagesAsRead,
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

  // Reactions + reply
  const { reactions, toggle: toggleReaction } = useMessageReactions(conversationId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = (m: Message) => {
    // Reactions/replies reference a real server row — skip un-sent bubbles.
    if (m.optimistic || m.status === 'failed' || String(m.id).startsWith('temp_')) return;
    if (m.message_type === 'viewing_proposal') return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => { vibrate(16); setActionMsg(m); }, 420);
  };
  const cancelLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  // Track which message IDs are "initial" for stagger animation
  const initialMsgIdsRef = useRef<Set<string>>(new Set());
  const prevConvIdRef = useRef<string | null>('__none__');
  // Track newly sent own message IDs for spring pop
  const newlyAddedIdsRef = useRef<Set<string>>(new Set());

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

  // Mark as read shortly after opening a conversation (the parent owns
  // fetching/subscribing now — this component only needs the read-receipt side effect)
  useEffect(() => {
    if (!conversationId) return;
    const tid = setTimeout(() => {
      markMessagesAsRead?.(conversationId);
    }, 1000);
    return () => clearTimeout(tid);
  }, [conversationId, markMessagesAsRead]);

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

  // Keep the thread pinned to the bottom while the keyboard opens/closes.
  // Pinning synchronously on every visual-viewport resize tick avoids the
  // up-then-down jump a delayed scroll caused after the keyboard animation.
  const isScrolledToBottomRef = useRef(true);
  useEffect(() => {
    isScrolledToBottomRef.current = isScrolledToBottom;
  }, [isScrolledToBottom]);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (!isScrolledToBottomRef.current) return;
      const viewport = scrollContainerRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

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
      // Effects run after the DOM commit, so scroll directly — stacked
      // timeouts here were one source of the visible double-jump.
      if (isOwn) {
        scrollToBottom(true);
      } else {
        vibrate(12); // gentle buzz when a message arrives
        if (isScrolledToBottom) scrollToBottom();
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

    vibrate(7); // subtle tick on send
    const replyId = replyTo?.id;
    setReplyTo(null);
    sendTypingIndicator(conversationId, false);
    setNewMessage('');
    // No scroll here: the new-message effect pins to the bottom right after
    // the optimistic bubble commits to the DOM.

    try {
      await sendMessage(conversationId, trimmed, files || [], replyId);
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
    // Pin immediately; the visual-viewport listener keeps us pinned while the
    // keyboard animates. (A 300ms delayed jump here read as an extra bounce.)
    scrollToBottom(true);
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

    // Group consecutive messages from the same sender (WhatsApp-style): the
    // follow-ups drop the sender name and hug the previous bubble.
    const prevMsg = messages[index - 1];
    const isGroupedWithPrev =
      !!prevMsg &&
      prevMsg.sender_id === message.sender_id &&
      prevMsg.message_type !== 'viewing_proposal' &&
      message.message_type !== 'viewing_proposal' &&
      !showNewDayDivider &&
      new Date(message.created_at).getTime() - new Date(prevMsg.created_at || 0).getTime() < 180_000;

    const hasAttachment = message.message_type === 'attachment' && message.attachment_url;

    // Reactions on this message + the message it quotes (if any).
    const msgReactions = reactions[message.id] || [];
    const quoted = message.reply_to_id ? messages.find((m) => m.id === message.reply_to_id) : null;

    // Staggered reveal for the initial batch; newly sent own bubbles get the
    // composer-origin send animation instead
    const isInitial = initialMsgIdsRef.current.has(message.id);
    const isNewOwn = isOwn && !isInitial;
    const staggerDelay = isInitial ? Math.min(index * 28, 380) : 0;

    const bubbleElement = (
      <MessageRow align={isOwn ? 'end' : 'start'} className={cn('items-end gap-2 mb-0.5', !isGroupedWithPrev && 'mt-2')}>
        <MessageColumn className={cn('gap-0.5', isOwn ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative w-fit max-w-[82%] md:max-w-[68%] px-4 py-2.5',
            // One flat royal blue for every outgoing bubble: a per-bubble
            // gradient renders a different shade per bubble size, which read
            // as inconsistent colors. Same soft shadow both directions.
            isOwn
              ? 'rounded-[26px] bg-[#4A6FE3] text-white shadow-[0_1px_2px_rgba(20,35,80,0.08),0_4px_10px_rgba(20,35,80,0.06)]'
              : 'rounded-[26px] bg-white text-ios-gray-dark border border-[rgba(15,23,42,0.06)] shadow-[0_1px_2px_rgba(20,35,80,0.08),0_4px_10px_rgba(20,35,80,0.06)]',
            // Animation — new own bubbles spring up from the composer;
            // everything else gets the calm fade/slide
            isNewOwn
              ? 'animate-msg-send origin-bottom-right'
              : isOwn
              ? 'animate-message-outgoing'
              : 'animate-msg-slide-in',
            'motion-reduce:animate-none'
          )}
          style={{
            wordBreak: 'break-word',
            animationDelay: isInitial ? `${staggerDelay}ms` : '0ms',
            animationFillMode: 'backwards',
            touchAction: 'pan-y',
          }}
          onPointerDown={() => startLongPress(message)}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onContextMenu={(e) => { e.preventDefault(); vibrate(12); setActionMsg(message); }}
        >
          {/* Sender name (incoming only; hidden on grouped follow-ups) */}
          {!isOwn && !isGroupedWithPrev && message.profiles?.display_name && (
            <div className="text-[11px] font-semibold text-ocean-blue mb-0.5 tracking-tight">
              {message.profiles.display_name}
            </div>
          )}

          {/* Quoted reply preview */}
          {quoted && (
            <div
              className={cn(
                'mb-1.5 rounded-lg py-1 pl-2 pr-2.5 border-l-2',
                isOwn ? 'border-white/70 bg-white/10' : 'border-ocean-blue/60 bg-black/[0.04]',
              )}
            >
              <div className={cn('text-[11px] font-semibold', isOwn ? 'text-white/90' : 'text-ocean-blue')}>
                {quoted.sender_id === user?.id ? 'You' : (quoted.profiles?.display_name || 'Message')}
              </div>
              <div className={cn('text-[12px] truncate', isOwn ? 'text-white/75' : 'text-ios-gray-dark/70')}>
                {quoted.message_type === 'attachment' ? '📎 Attachment' : (quoted.content || '')}
              </div>
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
              <MessageContent content={message.content} isOwn={isOwn} isLandlord={isLandlord} hideInviteCta />
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
        </div>
        {msgReactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 -mt-0.5', isOwn ? 'justify-end pr-1' : 'justify-start pl-1')}>
            {msgReactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(message.id, r.emoji)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[12.5px] leading-none border shadow-sm transition-transform active:scale-90',
                  r.mine ? 'bg-ocean-blue/10 border-ocean-blue/40' : 'bg-white border-black/8',
                )}
                aria-label={`${r.emoji} ${r.count}`}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="text-[11px] font-semibold text-ios-gray-dark tabular-nums">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
        </MessageColumn>
      </MessageRow>
    );

    return (
      <React.Fragment key={message.clientKey ?? message.id}>
        {showNewDayDivider && (
          <div className="flex justify-center my-4">
            <span className="px-3 py-1 text-[11px] font-semibold rounded-full bg-black/8 text-ios-gray-dark backdrop-blur-sm">
              {dayLabel(new Date(message.created_at))}
            </span>
          </div>
        )}

        {message.message_type === 'viewing_proposal' && message.viewing_proposal_id ? (
          <div
            id={`proposal-${message.viewing_proposal_id}`}
            className="max-w-[95%] sm:max-w-[85%] mx-auto my-4 animate-message-incoming"
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
        // Branded wallpaper (Mzanzi typography + doodle houses + ghosted
        // bubbles) on the calm light base. It sits on this non-scrolling
        // wrapper, so it stays fixed while messages scroll — WhatsApp-style.
        background: `url("${CHAT_WALLPAPER_URL}") center top / cover no-repeat, hsl(214, 22%, 96%)`,
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
                      'rounded-[26px]',
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

      {/* Long-press action sheet: react + reply */}
      {actionMsg && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
          onClick={() => setActionMsg(null)}
        >
          <div
            className="mb-24 w-[min(92%,360px)] rounded-2xl bg-white p-2 shadow-ios-lg animate-in fade-in slide-in-from-bottom-2 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-around px-1 py-1.5">
              {QUICK_REACTIONS.map((emoji) => {
                const mine = (reactions[actionMsg.id] || []).some((r) => r.emoji === emoji && r.mine);
                return (
                  <button
                    key={emoji}
                    onClick={() => { vibrate(10); toggleReaction(actionMsg.id, emoji); setActionMsg(null); }}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full text-[22px] transition-transform active:scale-90',
                      mine && 'bg-ocean-blue/12',
                    )}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <div className="my-1 h-px bg-black/[0.06]" />
            <button
              onClick={() => { setReplyTo(actionMsg); setActionMsg(null); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-ios-gray-dark hover:bg-black/5"
            >
              <ReplyIcon className="h-4 w-4 text-ocean-blue" /> Reply
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <div
        className="px-3 pt-2 pb-2 bg-white/90 backdrop-blur-md border-t border-black/6 sticky bottom-0 z-10 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-ocean-blue bg-black/[0.04] px-3 py-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <ReplyIcon className="h-4 w-4 shrink-0 text-ocean-blue" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-ocean-blue">
                Replying to {replyTo.sender_id === user?.id ? 'yourself' : (replyTo.profiles?.display_name || 'message')}
              </div>
              <div className="truncate text-[12px] text-ios-gray-dark/70">
                {replyTo.message_type === 'attachment' ? '📎 Attachment' : (replyTo.content || '')}
              </div>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="shrink-0 rounded-full p-1 text-ios-gray hover:bg-black/5"
              aria-label="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
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
