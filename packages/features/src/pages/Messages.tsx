import { useState, useRef, useEffect } from 'react';
import { LoadingLogo } from '@mzanzihomes/ui/components/LoadingLogo';
import { useWhatsAppMessaging } from '@mzanzihomes/features/messaging';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import {
  MessageSquare,
  ArrowLeft,
  Home,
  CalendarPlus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AddViewingSlotModal } from '@mzanzihomes/features/viewing';
import { BookViewingDialog } from '@mzanzihomes/features/viewing';
import { WhatsAppStyleThread } from '@mzanzihomes/features/messaging';
import { ViewingProposalCard } from '@mzanzihomes/features/viewing';
import { ViewingReminderHeader } from '@mzanzihomes/features/viewing';
import { useConfirmedViewing } from '@mzanzihomes/features/viewing';
import { useIsMobile } from '@mzanzihomes/ui/hooks/use-mobile';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { cn } from '@mzanzihomes/common/lib/utils';

// ─── Avatar gradient palette (deterministic from name) ───────────────────────

const AVATAR_GRADIENTS = [
  ['#3B82F6', '#1D4ED8'],   // blue
  ['#10B981', '#059669'],   // emerald
  ['#8B5CF6', '#6D28D9'],   // violet
  ['#F97316', '#EA580C'],   // orange
  ['#EC4899', '#BE185D'],   // rose
  ['#14B8A6', '#0F766E'],   // teal
  ['#6366F1', '#4338CA'],   // indigo
  ['#F59E0B', '#B45309'],   // amber
];

function getAvatarColors(name: string): [string, string] {
  if (!name) return AVATAR_GRADIENTS[0] as [string, string];
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length] as [string, string];
}

// ─── Conversation avatar ──────────────────────────────────────────────────────

function ConversationAvatar({
  name,
  size = 44,
  isOnline = false,
}: {
  name: string;
  size?: number;
  isOnline?: boolean;
}) {
  const [from, to] = getAvatarColors(name);
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold shadow-ios-xs"
        style={{
          background: `linear-gradient(135deg, ${from}, ${to})`,
          fontSize: size * 0.4,
        }}
      >
        {initial}
      </div>
      {isOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-[2px] border-background bg-emerald-500"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getShortPropertyInfo(conversation: any): string {
  const fullTitle = conversation.properties?.title || '';
  if (fullTitle.length <= 22) return fullTitle;
  const areaCityMatch = fullTitle.match(/([^,]+),\s*([^,]+)(?:,|$)/);
  if (areaCityMatch) return areaCityMatch[1].trim();
  const words = fullTitle.split(' ');
  const skipWords = ['House', 'Apartment', 'Unit', 'in', 'at', 'the'];
  for (const w of words) {
    if (!skipWords.includes(w)) return w;
  }
  return fullTitle.length > 22 ? fullTitle.substring(0, 22) + '…' : fullTitle;
}

// ─── Conversation list item ────────────────────────────────────────────────────

function ConversationItem({
  conversation,
  otherUser,
  isOnline,
  isActive,
  unreadCount,
  onClick,
  animIndex,
}: {
  conversation: any;
  otherUser: { id: string; name: string; role: string };
  isOnline: boolean;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
  animIndex: number;
}) {
  const propertyInfo = getShortPropertyInfo(conversation);
  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-3 flex items-center gap-3 transition-all duration-200',
        'animate-conversation-entry rounded-xl mx-1',
        'active:scale-[0.98] select-none',
        isActive
          ? 'bg-ocean-blue/8 border border-ocean-blue/15 shadow-ios-xs'
          : 'hover:bg-black/4 border border-transparent'
      )}
      style={{ animationDelay: `${Math.min(animIndex * 45, 400)}ms`, animationFillMode: 'backwards' }}
    >
      <ConversationAvatar name={otherUser.name} size={46} isOnline={isOnline} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className={cn(
              'text-[14px] leading-tight truncate',
              unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'
            )}
          >
            {otherUser.name}
          </span>
          {timeAgo && (
            <span
              className={cn(
                'text-[11px] shrink-0 tabular-nums',
                unreadCount > 0 ? 'text-ocean-blue font-semibold' : 'text-muted-foreground'
              )}
            >
              {timeAgo}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-black/6 text-muted-foreground font-medium shrink-0">
              {otherUser.role}
            </span>
            {propertyInfo && (
              <span className="text-[12px] text-muted-foreground truncate flex items-center gap-0.5">
                <Home className="h-3 w-3 shrink-0 opacity-50" />
                <span className="truncate">{propertyInfo}</span>
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-ocean-blue text-white flex items-center justify-center animate-badge-pop">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Messages() {
  const auth = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, isLandlord, authLoading } = auth || ({} as any);
  const { unreadCount: messageUnread } = useUnreadMessages();
  const [newMessage, setNewMessage] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const [hasPrefilledMessage, setHasPrefilledMessage] = useState(false);
  const [hasProcessedUrlParam, setHasProcessedUrlParam] = useState(false);
  const [sentAutoMessage, setSentAutoMessage] = useState(false);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [scrollToProposalFn, setScrollToProposalFn] = useState<((id: string) => void) | null>(null);

  // Anchor the full-screen chat pane to the *visible* viewport (the area not
  // covered by the on-screen keyboard) so the name header stays pinned to the
  // top and the composer rides just above the keyboard — iMessage-style.
  // Written straight to the DOM, NOT React state: a state update re-renders
  // the entire message list on every keyboard animation frame, which lags the
  // keyboard and reads as an up-then-down bounce.
  const chatPaneRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const el = chatPaneRef.current;
      if (!el) return;
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [showConversations]);

  // While a chat is open the page behind it must never scroll — otherwise
  // Safari pans the body when the input focuses (the other half of the jump).
  useEffect(() => {
    if (showConversations || !isMobile) return;
    const body = document.body;
    const prev = { overflow: body.style.overflow, overscroll: body.style.overscrollBehavior };
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      body.style.overflow = prev.overflow;
      body.style.overscrollBehavior = prev.overscroll;
    };
  }, [showConversations, isMobile]);

  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    connectionStatus,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    fetchMessages: refetchMessages,
    fetchConversations,
    markMessagesAsRead: markConversationMessagesAsRead,
  } = useWhatsAppMessaging();

  const { confirmedViewing } = useConfirmedViewing(activeConversation);
  const isMountedRef = useRef(true);

  const selectedConversation = activeConversation
    ? conversations.find(c => c.id === activeConversation)
    : undefined;

  const isLandlordInConversation = user && selectedConversation
    ? user.id === selectedConversation.landlord_id
    : isLandlord;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Pre-fill message for truly first-time contact
  useEffect(() => {
    if (selectedConversation && !isLandlord && !hasPrefilledMessage && !sentAutoMessage) {
      if (selectedConversation.last_message_at === null && messages.length === 0) {
        const propertyTitle = selectedConversation.properties?.title || 'this property';
        setNewMessage(
          `Hello, I am interested in ${propertyTitle}. I would like to schedule a viewing. Please let me know what times you have available.`
        );
        setHasPrefilledMessage(true);
      }
    }
    if (selectedConversation && hasPrefilledMessage && newMessage && messages.length > 0) {
      setHasPrefilledMessage(false);
    }
  }, [selectedConversation, messages, isLandlord, hasPrefilledMessage, newMessage, sentAutoMessage]);

  useEffect(() => { setSentAutoMessage(false); }, [activeConversation]);

  // Visibility-based read marking
  useEffect(() => {
    if (!activeConversation || !markConversationMessagesAsRead) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markConversationMessagesAsRead(activeConversation);
      }
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        markConversationMessagesAsRead(activeConversation);
      }
    }, 5000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [activeConversation, markConversationMessagesAsRead]);

  // Handle initial URL parameter
  useEffect(() => {
    if (hasProcessedUrlParam || conversations.length === 0) return;
    const cid = searchParams.get('c');
    const messageParam = searchParams.get('message');
    if (cid) {
      const exists = conversations.find(c => c.id === cid);
      if (exists) {
        setActiveConversation(cid);
        setShowConversations(false);
        setHasPrefilledMessage(false);
        if (messageParam) {
          setNewMessage(decodeURIComponent(messageParam));
          setHasPrefilledMessage(true);
        }
        setHasProcessedUrlParam(true);
      }
    } else {
      setHasProcessedUrlParam(true);
    }
  }, [conversations, searchParams, hasProcessedUrlParam]);

  const handleViewingModalSuccess = () => {
    if (activeConversation) refetchMessages(activeConversation);
  };

  const getOtherUser = (conversation: any) => {
    if (isLandlord) {
      return {
        id: conversation.tenant_id,
        name: conversation.tenant_profile?.display_name || 'Tenant',
        role: 'Tenant',
      };
    }
    return {
      id: conversation.landlord_id,
      name: conversation.landlord_profile?.display_name || 'Landlord',
      role: 'Landlord',
    };
  };

  const handleConversationClick = (conversationId: string) => {
    setActiveConversation(conversationId);
    setShowConversations(false);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('c', conversationId);
    navigate({ search: newSearchParams.toString() }, { replace: true });
    setTimeout(() => {
      if (markConversationMessagesAsRead) {
        markConversationMessagesAsRead(conversationId);
      }
    }, 1500);
  };

  // ─── Auth guards ─────────────────────────────────────────────────────────────

  if (auth && auth.user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-ocean-blue/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-ocean-blue" />
          </div>
          <h2 className="text-xl font-bold mb-2">Sign in to message</h2>
          <p className="text-muted-foreground text-sm">Connect with landlords and tenants</p>
        </div>
      </div>
    );
  }

  if (auth && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  // ─── Shared conversation list render ─────────────────────────────────────────

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const renderConversationList = (compact = false) => {
    if (loading && conversations.length === 0) {
      return (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="h-11 w-11 rounded-full bg-black/8 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-black/8 rounded-full animate-pulse w-3/5" />
                <div className="h-3 bg-black/6 rounded-full animate-pulse w-4/5" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-ocean-blue/8 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-ocean-blue/60" />
          </div>
          <h3 className="font-semibold text-base mb-1.5">No conversations yet</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isLandlord
              ? 'Messages from tenants and applicants will appear here'
              : 'Messages from landlords will appear here'}
          </p>
        </div>
      );
    }

    return (
      <div className="py-2 space-y-0.5">
        {conversations.map((conversation, i) => {
          const otherUser = getOtherUser(conversation);
          return (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              otherUser={otherUser}
              isOnline={onlineUsers.has(otherUser.id)}
              isActive={activeConversation === conversation.id}
              unreadCount={conversation.unread_count || 0}
              onClick={() => handleConversationClick(conversation.id)}
              animIndex={i}
            />
          );
        })}
      </div>
    );
  };

  // ─── Mobile layout ────────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <>
        {/* Conversations list */}
        {showConversations && (
          <div className="min-h-screen bg-background">
            {/* Mobile header */}
            <div
              className="sticky top-0 z-20 px-4 pb-4 flex items-center justify-between gap-3"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
                background: 'linear-gradient(180deg, #12315f 0%, #0a1f45 100%)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() =>
                    window.history.length > 1
                      ? navigate(-1)
                      : navigate(isLandlord ? '/enhancedlandlorddashboard' : '/')
                  }
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-white/15 bg-white/10 text-white active:scale-95 transition"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#2563EB' }}>
                  <MessageSquare className="h-[18px] w-[18px] text-white" />
                </div>
                <h1 className="text-[19px] font-bold tracking-tight text-white">Messages</h1>
                {totalUnread > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-white">
                    {totalUnread}
                  </span>
                )}
              </div>
            </div>

            {/* List */}
            <div
              className="overflow-auto"
              style={{ height: 'calc(100vh - 60px - env(safe-area-inset-bottom))' }}
            >
              {renderConversationList(true)}
            </div>
          </div>
        )}

        {/* Full-screen chat */}
        {!showConversations && selectedConversation && (
          <div
            ref={chatPaneRef}
            className="fixed left-0 right-0 flex flex-col z-30 bg-background"
            style={{
              // Fallback until the visual-viewport effect takes over; it then
              // writes top/height directly on keyboard frames (no re-render,
              // no CSS transition — the browser animates the keyboard itself).
              top: 0,
              height: '100svh',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Chat header */}
            <div
              className="shrink-0 flex items-center gap-2.5 px-3 border-b border-black/6"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
                paddingBottom: '10px',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <button
                onClick={() => {
                  setShowConversations(true);
                  navigate('/messages', { replace: true });
                }}
                className="w-8 h-8 rounded-full bg-black/6 flex items-center justify-center hover:bg-black/10 active:scale-90 transition-all shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <ConversationAvatar
                name={getOtherUser(selectedConversation).name}
                size={36}
                isOnline={onlineUsers.has(getOtherUser(selectedConversation).id)}
              />

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[14px] leading-tight truncate">
                  {getOtherUser(selectedConversation).name}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded-full bg-black/6 font-medium">
                    {getOtherUser(selectedConversation).role}
                  </span>
                  {onlineUsers.has(getOtherUser(selectedConversation).id) ? (
                    <span className="text-emerald-600 font-medium">Online</span>
                  ) : (
                    <span>Offline</span>
                  )}
                  {selectedConversation.properties?.title && (
                    <>
                      <span className="text-black/20">·</span>
                      <span className="truncate flex items-center gap-0.5">
                        <Home className="h-2.5 w-2.5 shrink-0" />
                        {getShortPropertyInfo(selectedConversation)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isLandlordInConversation ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowViewingModal(true)}
                  className="shrink-0 h-8 px-2.5 text-xs gap-1"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Viewing</span>
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowBookingDialog(true)}
                  className="shrink-0 h-8 px-2.5 text-xs gap-1"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Request Viewing</span>
                </Button>
              )}
            </div>

            {/* Viewing reminder */}
            {confirmedViewing && (
              <ViewingReminderHeader
                viewing={confirmedViewing}
                onViewDetails={() => {
                  if (scrollToProposalFn) {
                    scrollToProposalFn(confirmedViewing.id);
                  } else {
                    window.dispatchEvent(
                      new CustomEvent('scroll-to-proposal', { detail: { id: confirmedViewing.id } })
                    );
                  }
                }}
              />
            )}

            {/* Thread */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <WhatsAppStyleThread
                conversationId={activeConversation}
                messages={messages}
                loading={loading}
                typingUsers={typingUsers}
                sendMessage={sendMessage}
                sendTypingIndicator={sendTypingIndicator}
                markMessagesAsRead={markConversationMessagesAsRead}
                onMessageSent={() => fetchConversations?.()}
                onScrollToProposal={setScrollToProposalFn}
                onCreateViewing={isLandlordInConversation ? () => setShowViewingModal(true) : undefined}
                isLandlordInConversation={isLandlordInConversation}
                renderViewingProposal={(p) => (
                  <ViewingProposalCard
                    proposal={p.proposal as any}
                    onUpdate={p.onUpdate}
                    isLandlordInConversation={p.isLandlordInConversation}
                  />
                )}
              />
            </div>
          </div>
        )}

        {/* Modals */}
        {selectedConversation && (
          <AddViewingSlotModal
            open={showViewingModal}
            onOpenChange={setShowViewingModal}
            conversationId={selectedConversation.id}
            propertyId={selectedConversation.property_id}
            tenantId={selectedConversation.tenant_id}
            propertyTitle={selectedConversation.properties?.title}
            onSuccess={handleViewingModalSuccess}
          />
        )}
        {selectedConversation && !isLandlordInConversation && (
          <BookViewingDialog
            propertyId={selectedConversation.property_id}
            landlordId={selectedConversation.landlord_id}
            open={showBookingDialog}
            onOpenChange={setShowBookingDialog}
          />
        )}
      </>
    );
  }

  // ─── Desktop layout ───────────────────────────────────────────────────────────

  return (
    <div className="px-4 md:px-8 lg:px-10">
      {/* Desktop header */}
      <div className="flex items-center gap-4 mb-6 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
          className="hidden md:inline-flex gap-1.5"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-ocean-blue flex items-center justify-center shadow-ios-xs">
            <MessageSquare className="h-4.5 w-4.5 text-white" style={{ width: '18px', height: '18px' }} />
          </div>
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
        {totalUnread > 0 && (
          <span className="px-2.5 py-1 rounded-full text-sm font-bold bg-ocean-blue text-white animate-badge-pop">
            {totalUnread} unread
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-5 h-[calc(100vh-11rem)]">
        {/* Left: conversation list */}
        <div className="col-span-1 h-full rounded-2xl border border-black/8 bg-white/80 backdrop-blur-sm shadow-ios-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-black/6 shrink-0">
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Conversations
            </p>
          </div>
          <div className="flex-1 overflow-auto">
            {renderConversationList()}
          </div>
        </div>

        {/* Right: chat window */}
        <div className="col-span-2 h-full rounded-2xl border border-black/8 bg-white shadow-ios-sm overflow-hidden flex flex-col">
          {selectedConversation ? (
            <>
              {/* Desktop chat header */}
              <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-black/6 bg-white">
                <ConversationAvatar
                  name={getOtherUser(selectedConversation).name}
                  size={40}
                  isOnline={onlineUsers.has(getOtherUser(selectedConversation).id)}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base leading-tight">
                    {getOtherUser(selectedConversation).name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <span className="px-1.5 py-0.5 rounded-full bg-black/6 text-xs font-medium">
                      {getOtherUser(selectedConversation).role}
                    </span>
                    {onlineUsers.has(getOtherUser(selectedConversation).id) ? (
                      <span className="text-emerald-600 text-xs font-medium">Online</span>
                    ) : (
                      <span className="text-xs">Offline</span>
                    )}
                    {selectedConversation.properties?.title && (
                      <>
                        <span className="text-black/20">·</span>
                        <span className="text-xs flex items-center gap-1 truncate">
                          <Home className="h-3 w-3 shrink-0 opacity-50" />
                          {getShortPropertyInfo(selectedConversation)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {isLandlordInConversation ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowViewingModal(true)}
                    className="shrink-0 gap-2"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Create Viewing
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowBookingDialog(true)}
                    className="shrink-0 gap-2"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Request Viewing
                  </Button>
                )}
              </div>

              {/* Viewing reminder */}
              {confirmedViewing && (
                <ViewingReminderHeader
                  viewing={confirmedViewing}
                  onViewDetails={() => {
                    if (scrollToProposalFn) {
                      scrollToProposalFn(confirmedViewing.id);
                    } else {
                      window.dispatchEvent(
                        new CustomEvent('scroll-to-proposal', { detail: { id: confirmedViewing.id } })
                      );
                    }
                  }}
                />
              )}

              {/* Thread */}
              <div className="flex-1 min-h-0">
                <WhatsAppStyleThread
                  conversationId={activeConversation}
                  messages={messages}
                  loading={loading}
                  typingUsers={typingUsers}
                  sendMessage={sendMessage}
                  sendTypingIndicator={sendTypingIndicator}
                  markMessagesAsRead={markConversationMessagesAsRead}
                  onMessageSent={() => fetchConversations?.()}
                  onScrollToProposal={setScrollToProposalFn}
                  onCreateViewing={isLandlordInConversation ? () => setShowViewingModal(true) : undefined}
                  isLandlordInConversation={isLandlordInConversation}
                  tenantId={selectedConversation?.tenant_id}
                  propertyId={selectedConversation?.property_id}
                  renderViewingProposal={(p) => (
                    <ViewingProposalCard
                      proposal={p.proposal as any}
                      onUpdate={p.onUpdate}
                      isLandlordInConversation={p.isLandlordInConversation}
                    />
                  )}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-20 h-20 rounded-3xl bg-ocean-blue/8 flex items-center justify-center mb-5 shadow-ios-xs">
                <MessageSquare className="h-10 w-10 text-ocean-blue/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Viewing Slot Modal */}
      {selectedConversation && (
        <AddViewingSlotModal
          open={showViewingModal}
          onOpenChange={setShowViewingModal}
          conversationId={selectedConversation.id}
          propertyId={selectedConversation.property_id}
          tenantId={selectedConversation.tenant_id}
          propertyTitle={selectedConversation.properties?.title}
          onSuccess={handleViewingModalSuccess}
        />
      )}
      {selectedConversation && !isLandlordInConversation && (
        <BookViewingDialog
          propertyId={selectedConversation.property_id}
          landlordId={selectedConversation.landlord_id}
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
        />
      )}
    </div>
  );
}
