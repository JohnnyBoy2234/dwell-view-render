import { useState, useRef, useEffect, useCallback } from 'react';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  Home,
  Clock,
  Check,
  CheckCheck,
  Bell
} from 'lucide-react';
import { ConnectionHealthIndicator } from '@/components/messaging/ConnectionHealthIndicator';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ViewingSlotNotification } from '@/components/messaging/ViewingSlotNotification';
import { ViewingProposalCard } from '@/components/messaging/ViewingProposalCard';
import { AddViewingSlotModal } from '@/components/messaging/AddViewingSlotModal';
import { BookViewingDialog } from '@/components/viewing/BookViewingDialog';
import { WhatsAppStyleThread } from '@/components/messaging/WhatsAppStyleThread';
import { ViewingReminderHeader } from '@/components/messaging/ViewingReminderHeader';
import { useConfirmedViewing } from '@/hooks/useConfirmedViewing';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import TenantBadgeDisplay from '@/components/payments/TenantBadgeDisplay';
import { useTenantBadges } from '@/hooks/useTenantBadges';

export default function Messages() {
  // Initialize auth context; do not early-return before hooks are declared
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
  const enableViewingUI = true;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputFormRef = useRef<HTMLFormElement>(null);
  const inputFieldRef = useRef<HTMLInputElement>(null);
  const [inputHeight, setInputHeight] = useState<number>(64);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [scrollToProposalFn, setScrollToProposalFn] = useState<((id: string) => void) | null>(null);

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
    markMessagesAsRead: markConversationMessagesAsRead
  } = useWhatsAppMessaging();
  
  const { confirmedViewing } = useConfirmedViewing(activeConversation);

  // Add mount tracking
  const isMountedRef = useRef(true);

  const selectedConversation = activeConversation ? conversations.find(c => c.id === activeConversation) : undefined;
  const isLandlordInConversation = user && selectedConversation
    ? user.id === selectedConversation.landlord_id
    : isLandlord;

  // Component mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll to bottom when messages change or when opening a chat
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, selectedConversation]);

  // Measure input height and update bottom padding for mobile keyboard safety
  useEffect(() => {
    const measure = () => {
      if (inputFormRef.current) {
        setInputHeight(inputFormRef.current.offsetHeight || 64);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Pre-fill message only for truly first-time contact (no conversation history)
  useEffect(() => {
    if (selectedConversation && !isLandlord && !hasPrefilledMessage && !sentAutoMessage) {
      // Only show pre-typed message if conversation has no message history at all
      if (selectedConversation.last_message_at === null && messages.length === 0) {
        const propertyTitle = selectedConversation.properties?.title || 'this property';
        const autoMessage = `Hello, I am interested in ${propertyTitle}. I would like to schedule a viewing. Please let me know what times you have available.`;
        setNewMessage(autoMessage);
        setHasPrefilledMessage(true);
      }
    }
    
    // Clear pre-typed message if user manually switches conversations
    if (selectedConversation && hasPrefilledMessage && newMessage && messages.length > 0) {
      setHasPrefilledMessage(false);
    }
  }, [selectedConversation, messages, isLandlord, hasPrefilledMessage, newMessage, sentAutoMessage]);

  // Reset sentAutoMessage when switching conversations
  useEffect(() => {
    setSentAutoMessage(false);
  }, [activeConversation]);

  // Add visibility-based read marking for active conversations
  useEffect(() => {
    if (!activeConversation || !markConversationMessagesAsRead) return;

    // Mark messages as read when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        console.log('📖 Messages Page: Page became visible, marking messages as read');
        markConversationMessagesAsRead(activeConversation);
      }
    };

    // Mark messages as read periodically while viewing
    const markAsReadInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        console.log('📖 Messages Page: Periodic read marking for active conversation:', activeConversation);
        markConversationMessagesAsRead(activeConversation);
      }
    }, 5000); // Every 5 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(markAsReadInterval);
    };
  }, [activeConversation, markConversationMessagesAsRead]);

  // Handle initial URL parameter only once
  useEffect(() => {
    if (hasProcessedUrlParam || conversations.length === 0) return;
    
    const cid = searchParams.get('c');
    const messageParam = searchParams.get('message');
    console.log('🔗 Processing URL parameter:', cid, 'message:', messageParam);
    
    if (cid) {
      const exists = conversations.find(c => c.id === cid);
      if (exists) {
        console.log('✅ Setting conversation from URL:', cid);
        setActiveConversation(cid);
        setShowConversations(false);
        setHasPrefilledMessage(false);
        
        // Pre-fill message if provided in URL
        if (messageParam) {
          setNewMessage(decodeURIComponent(messageParam));
          setHasPrefilledMessage(true);
          // Don't set sentAutoMessage to true here since it hasn't been sent yet
        }
        
        setHasProcessedUrlParam(true);
      }
    } else {
      setHasProcessedUrlParam(true);
    }
  }, [conversations, searchParams, hasProcessedUrlParam]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    // Send typing stop indicator
    sendTypingIndicator(activeConversation, false);
    
    await sendMessage(activeConversation, newMessage);
    
    // Mark auto message as sent if this was the pre-filled message
    if (hasPrefilledMessage) {
      setSentAutoMessage(true);
      setHasPrefilledMessage(false);
    }
    
    setNewMessage('');
  };

  const handleViewingModalSuccess = () => {
    // Refresh messages to show new viewing proposal
    if (activeConversation) {
      refetchMessages(activeConversation);
    }
  };

  const getOtherUser = (conversation: any) => {
    if (isLandlord) {
      return {
        id: conversation.tenant_id,
        name: conversation.tenant_profile?.display_name || 'Tenant',
        role: 'Tenant'
      };
    } else {
      return {
        id: conversation.landlord_id,
        name: conversation.landlord_profile?.display_name || 'Landlord',
        role: 'Landlord'
      };
    }
  };

  const getShortPropertyInfo = (conversation: any) => {
    const fullTitle = conversation.properties?.title || '';
    
    // If the title is short enough, show it as is
    if (fullTitle.length <= 20) {
      return fullTitle;
    }
    
    // Try to extract just the area/suburb from common address patterns
    // Look for patterns like "Area, City" or "Suburb, City"
    const areaCityMatch = fullTitle.match(/([^,]+),\s*([^,]+)(?:,|$)/);
    if (areaCityMatch) {
      const area = areaCityMatch[1].trim();
      return area;
    }
    
    // If no comma pattern, try to get first meaningful word (assuming it might be area)
    const words = fullTitle.split(' ');
    if (words.length >= 2) {
      // Skip common words like "House", "Apartment", "in", "at"
      const skipWords = ['House', 'Apartment', 'Unit', 'in', 'at', 'the'];
      for (let i = 0; i < words.length; i++) {
        if (!skipWords.includes(words[i])) {
          return words[i];
        }
      }
    }
    
    // Fallback: truncate to 20 characters
    return fullTitle.length > 20 ? fullTitle.substring(0, 20) + '...' : fullTitle;
  };

  const isMessageRead = (message: any) => {
    if (isLandlord) {
      return message.read_by_landlord;
    } else {
      return message.read_by_tenant;
    }
  };

  const handleConversationClick = (conversationId: string) => {
    console.log('👆 Manual conversation switch to:', conversationId);
    setActiveConversation(conversationId);
    setShowConversations(false);
    
    // Set URL parameter for mobile bottom bar to hide
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('c', conversationId);
    navigate({ search: newSearchParams.toString() }, { replace: true });

    // Mark messages as read when opening conversation
    setTimeout(() => {
      if (markConversationMessagesAsRead) {
        console.log('📖 Messages Page: Marking messages as read for conversation:', conversationId);
        markConversationMessagesAsRead(conversationId);
      }
    }, 1500);
  };

  if (auth && auth.user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="p-8 text-center bg-card rounded-lg border shadow-lg">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign in to access messages</h2>
          <p className="text-muted-foreground">Connect with landlords and tenants</p>
        </div>
      </div>
    );
  }

  // Loading guard to avoid rendering unstable subtrees
  if (auth && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="p-8 text-center bg-card rounded-lg border shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">Loading messages...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <>
        {/* Main Messages Page - Shows with bottom menu */}
        {showConversations && (
          <div className="min-h-screen bg-background">
            {/* Mobile Messages Page Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold">Messages</h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ConnectionHealthIndicator 
                  status={connectionStatus} 
                  onlineUsers={onlineUsers}
                  className="text-xs"
                />
                <Badge variant="secondary" className="text-xs">
                  {conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} unread
                </Badge>
              </div>
            </div>
            
            {/* Conversations List - Mobile */}
            <div className="flex-1 flex flex-col h-[calc(100vh-8rem)]">
              <div className="flex-1 min-h-0 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <div>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                      <p className="text-muted-foreground">Loading conversations...</p>
                    </div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <div>
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                      <p className="text-muted-foreground">
                        {isLandlord ? "Messages from tenants and applicants will appear here" : "Messages from landlords will appear here"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => {
                      const otherUser = getOtherUser(conversation);
                      const isOnline = onlineUsers.has(otherUser.id);
                      
                      return (
                        <div
                          key={conversation.id}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-l-4 ${
                            activeConversation === conversation.id
                              ? 'bg-muted border-l-primary'
                              : 'border-l-transparent'
                          }`}
                          onClick={() => handleConversationClick(conversation.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {otherUser.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isOnline && (
                                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm truncate">
                                  {otherUser.name}
                                </p>
                                {conversation.unread_count && conversation.unread_count > 0 && (
                                  <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center flex-shrink-0">
                                    {conversation.unread_count}
                                  </Badge>
                                )}
                              </div>
                              
                               <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                <Home className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                <span className="break-words leading-tight">{getShortPropertyInfo(conversation)}</span>
                              </div>
                              
                              <p className="text-xs text-muted-foreground mt-1">
                                {conversation.last_message_at
                                  ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
                                  : 'Loading...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Window - Mobile Full Screen (hides bottom menu) */}
        {!showConversations && selectedConversation && (
          <div className="fixed inset-0 bg-background flex flex-col z-30" style={{ height: '100svh', overscrollBehavior: 'contain' as any }}>
              {/* Mobile Chat Header - sticky within chat container */}
              <div className="sticky top-0 left-0 right-0 flex items-center gap-3 border-b bg-background/95 backdrop-blur-sm z-50 flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '10px', paddingLeft: '16px', paddingRight: '16px' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowConversations(true);
                    // Clear the conversation parameter from URL to show bottom bar
                    navigate('/messages', { replace: true });
                  }}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getOtherUser(selectedConversation).name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.has(getOtherUser(selectedConversation).id) && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{getOtherUser(selectedConversation).name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getOtherUser(selectedConversation).role}
                      </Badge>
                      {onlineUsers.has(getOtherUser(selectedConversation).id) ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        <span>Offline</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Home className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{getShortPropertyInfo(selectedConversation)}</span>
                    </div>
                  </div>
                </div>
              </div>
            {/* Viewing Reminder Header - Only show for confirmed viewings */}
            {confirmedViewing && (
              <ViewingReminderHeader 
                viewing={confirmedViewing}
                onViewDetails={() => {
                  if (scrollToProposalFn) {
                    scrollToProposalFn(confirmedViewing.id);
                  } else {
                    // Fallback to custom event
                    const ev = new CustomEvent('scroll-to-proposal', { detail: { id: confirmedViewing.id } });
                    window.dispatchEvent(ev);
                  }
                }}
              />
            )}
            
            {/* Messages - Mobile */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <WhatsAppStyleThread 
                conversationId={activeConversation}
                onMessageSent={() => {
                  // Refresh conversations to update last message
                  fetchConversations?.();
                }}
                onScrollToProposal={setScrollToProposalFn}
                onCreateViewing={isLandlord ? () => setShowViewingModal(true) : undefined}
              />
            </div>
            </div>
          )}

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

        {/* Tenant booking dialog */}
        {selectedConversation && !isLandlord && (
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

  // Desktop layout
  return (
    <div className="px-4 md:px-8 lg:px-12">
    {/* Desktop Messages Page Header */}
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/')}
        className="hidden md:inline-flex"
      >
        <Home className="h-4 w-4 mr-2" />
        Home
      </Button>
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>
      <Badge variant="secondary" className="text-sm">
        {conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} unread conversations
      </Badge>
    </div>
    
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Conversations List - Desktop */}
      <div className="col-span-1">
        <div className="h-full rounded-lg border bg-card">
          
          <div className="p-0">
            <div className="h-[calc(100vh-8rem)] overflow-auto">
              {loading && conversations.length === 0 ? (
                <div className="animate-pulse space-y-3 p-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-md"></div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                  <p className="text-muted-foreground">
                    {isLandlord ? "Messages from tenants and applicants will appear here" : "Messages from landlords will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => {
                    const otherUser = getOtherUser(conversation);
                    const isOnline = onlineUsers.has(otherUser.id);
                    
                    return (
                      <div
                        key={conversation.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-l-4 ${
                          activeConversation === conversation.id
                            ? 'bg-muted border-l-primary'
                            : 'border-l-transparent'
                        }`}
                        onClick={() => handleConversationClick(conversation.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {otherUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm truncate">
                                {otherUser.name}
                              </p>
                              {conversation.unread_count && conversation.unread_count > 0 && (
                                <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-start gap-1 text-xs text-muted-foreground">
                              <Home className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span className="break-words leading-tight">{getShortPropertyInfo(conversation)}</span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              {conversation.last_message_at
                                ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
                                : 'Loading...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window - Desktop */}
      <div className="col-span-2">
        {selectedConversation ? (
          <div className="h-full flex flex-col rounded-lg border bg-card">
            {/* Desktop Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-card sticky top-0 z-20 flex-shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getOtherUser(selectedConversation).name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUsers.has(getOtherUser(selectedConversation).id) && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{getOtherUser(selectedConversation).name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {getOtherUser(selectedConversation).role}
                    </Badge>
                    {onlineUsers.has(getOtherUser(selectedConversation).id) ? (
                      <span className="text-green-600">Online</span>
                    ) : (
                      <span>Offline</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Home className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{getShortPropertyInfo(selectedConversation)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Viewing Reminder Header - Desktop */}
            {confirmedViewing && (
              <ViewingReminderHeader 
                viewing={confirmedViewing}
                onViewDetails={() => {
                  if (scrollToProposalFn) {
                    scrollToProposalFn(confirmedViewing.id);
                  } else {
                    // Fallback to custom event
                    const ev = new CustomEvent('scroll-to-proposal', { detail: { id: confirmedViewing.id } });
                    window.dispatchEvent(ev);
                  }
                }}
              />
            )}

            {/* Messages */}
            <div className="flex-1 min-h-0">
              {loading && messages.length === 0 ? (
                <div className="animate-pulse space-y-3 p-4">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="h-10 bg-muted rounded-md"></div>
                  ))}
                </div>
              ) : (
                <WhatsAppStyleThread 
                  conversationId={activeConversation}
                  onMessageSent={() => {
                    // Refresh conversations to update last message
                    fetchConversations?.();
                  }}
                  onScrollToProposal={setScrollToProposalFn}
                  onCreateViewing={isLandlordInConversation ? () => setShowViewingModal(true) : undefined}
                  isLandlordInConversation={isLandlordInConversation}
                  tenantId={selectedConversation?.tenant_id}
                  propertyId={selectedConversation?.property_id}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center rounded-lg border bg-card">
            <div className="text-center p-8">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a conversation to start messaging</p>
            </div>
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
    </div>
  );
}