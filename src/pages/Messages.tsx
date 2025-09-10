import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  Home,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ViewingSlotNotification } from '@/components/messaging/ViewingSlotNotification';
import { ViewingProposalCard } from '@/components/messaging/ViewingProposalCard';
import { AddViewingSlotModal } from '@/components/messaging/AddViewingSlotModal';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Messages() {
  const { user, isLandlord } = useAuth();
  const isMobile = useIsMobile();
  const [newMessage, setNewMessage] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const [hasPrefilledMessage, setHasPrefilledMessage] = useState(false);
  const [hasProcessedUrlParam, setHasProcessedUrlParam] = useState(false);
  const [sentAutoMessage, setSentAutoMessage] = useState(false);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingProposals, setViewingProposals] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Define fetchViewingProposals as useCallback to avoid dependency issues
  const fetchViewingProposals = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('viewing_proposals')
        .select(`
          *,
          properties (
            title,
            location
          )
        `)
        .eq('conversation_id', activeConversation)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setViewingProposals(data || []);
    } catch (error) {
      console.error('Error fetching viewing requests:', error);
    }
  }, [activeConversation, user]);

  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    sendMessage,
    fetchMessages: refetchMessages
  } = useMessaging(() => {
    // Refresh viewing proposals when they change
    fetchViewingProposals();
  });

  const selectedConversation = conversations.find(c => c.id === activeConversation);

  // Fetch viewing requests for active conversation
  useEffect(() => {
    if (activeConversation && user) {
      fetchViewingProposals();
    }
  }, [activeConversation, user, fetchViewingProposals]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Remove scroll handler - header is now permanently fixed

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    await sendMessage(activeConversation, newMessage);
    
    // Mark auto message as sent if this was the pre-filled message
    if (hasPrefilledMessage) {
      setSentAutoMessage(true);
      setHasPrefilledMessage(false);
    }
    
    setNewMessage('');
  };

  const handleViewingModalSuccess = () => {
    fetchViewingProposals();
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
  };

  if (!user) {
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

  // Mobile full-screen layout
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-background flex flex-col z-30">
          {/* Conversations List - Mobile */}
          {showConversations && (
            <div className="flex-1 flex flex-col h-full">              
              <ScrollArea className="flex-1 min-h-0">
                {conversations.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <div>
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No conversations yet</p>
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
                                <span className="break-words leading-tight">{conversation.properties?.title}</span>
                              </div>
                              
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Chat Window - Mobile Full Screen */}
          {!showConversations && selectedConversation && (
            <div className="flex-1 flex flex-col h-full relative">
                {/* Messages - Mobile */}
                <div className="flex-1 min-h-0 pt-20">
                  <ScrollArea className="h-full" ref={scrollAreaRef}>
                  <div className="p-4 space-y-3">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                        <div className="text-center">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Viewing components */}
                        {!isLandlord && selectedConversation && (
                          <ViewingSlotNotification
                            propertyId={selectedConversation.property_id}
                            landlordId={selectedConversation.landlord_id}
                            propertyTitle={selectedConversation.properties?.title || 'Property'}
                          />
                        )}

                        {isLandlord && selectedConversation && (
                          <div className="bg-muted/30 rounded-lg p-3 border-l-4 border-l-primary">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">Schedule a viewing</p>
                                <p className="text-xs text-muted-foreground">Create a viewing request for this tenant</p>
                              </div>
                              <Button
                                onClick={() => setShowViewingModal(true)}
                                size="sm"
                                className="bg-primary hover:bg-primary/90"
                              >
                                Create
                              </Button>
                            </div>
                          </div>
                        )}

                        {viewingProposals.map((proposal) => (
                          <div key={proposal.id} className="flex justify-center">
                            <ViewingProposalCard
                              proposal={proposal}
                              onUpdate={() => {
                                fetchViewingProposals();
                                if (activeConversation) {
                                  refetchMessages(activeConversation);
                                }
                              }}
                            />
                          </div>
                        ))}
                        
                        {messages.map((message) => {
                          const isSender = message.sender_id === user.id;
                          const isRead = isMessageRead(message);
                          
                          if (message.message_type === 'viewing_proposal') {
                            return null;
                          }
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex mb-3 ${isSender ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] ${isSender ? 'order-2' : 'order-1'}`}>
                                <div
                                  className={`rounded-2xl px-4 py-3 ${
                                    isSender
                                      ? 'bg-primary text-primary-foreground rounded-br-md'
                                      : 'bg-muted text-foreground rounded-bl-md'
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                                </div>
                                
                                <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                                  isSender ? 'justify-end' : 'justify-start'
                                }`}>
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  {isSender && (
                                    <div className="ml-1">
                                      {isRead ? (
                                        <CheckCheck className="h-3 w-3 text-blue-500" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  </ScrollArea>
                </div>

                {/* Message Input - Mobile */}
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-background flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-full"
                    disabled={loading}
                  />
                  <Button type="submit" disabled={!newMessage.trim() || loading} className="rounded-full h-10 w-10 p-0 flex-shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                </form>
              </div>
          )}
        </div>

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
      </>
    );
  }

  // Desktop layout
  return (
    <>
    {/* Desktop Header */}
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-semibold">Conversations</h2>
      </div>
      <Badge variant="secondary" className="text-xs">
        {conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} unread
      </Badge>
    </div>
    
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Conversations List - Desktop */}
      <div className="col-span-1">
        <div className="h-full rounded-lg border bg-card">
          <div className="p-6 pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Conversations</h3>
            </div>
          </div>
          
          <div className="p-0">
            <ScrollArea className="h-[calc(100vh-20rem)]">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No conversations yet</p>
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
                              <span className="break-words leading-tight">{conversation.properties?.title}</span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Chat Window - Desktop */}
      <div className="col-span-2">
        {selectedConversation ? (
          <div className="h-full flex flex-col rounded-lg border bg-card">
            {/* Chat Header */}
            <div className="flex-shrink-0 p-6 pb-3 border-b">
              <div className="flex items-center gap-3">
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
                
                <div className="flex-1">
                  <h3 className="font-semibold">{getOtherUser(selectedConversation).name}</h3>
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
                </div>
              </div>
              
              <div className="my-3">
                <Separator />
              </div>
              
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="break-words leading-tight">{selectedConversation.properties?.title}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full px-4">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                     {/* Viewing Slot Notification for Tenants */}
                    {!isLandlord && selectedConversation && (
                      <ViewingSlotNotification
                        propertyId={selectedConversation.property_id}
                        landlordId={selectedConversation.landlord_id}
                        propertyTitle={selectedConversation.properties?.title || 'Property'}
                      />
                    )}

                    {/* Create Viewing Slot Button for Landlords */}
                    {isLandlord && selectedConversation && (
                      <div className="bg-muted/30 rounded-lg p-3 border-l-4 border-l-primary">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Schedule a viewing</p>
                            <p className="text-xs text-muted-foreground">Create a viewing request for this tenant</p>
                          </div>
                          <Button
                            onClick={() => setShowViewingModal(true)}
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                          >
                            Create / Add Viewing Slot
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Viewing Requests */}
                    {viewingProposals.map((proposal) => (
                      <div key={proposal.id} className="flex justify-center">
                        <ViewingProposalCard
                          proposal={proposal}
                          onUpdate={() => {
                            fetchViewingProposals();
                            if (activeConversation) {
                              refetchMessages(activeConversation);
                            }
                          }}
                        />
                      </div>
                    ))}
                    
                     {messages.map((message) => {
                      const isSender = message.sender_id === user.id;
                      const isRead = isMessageRead(message);
                      
                      // Skip rendering messages that are viewing_proposal type as they're handled above
                      if (message.message_type === 'viewing_proposal') {
                        return null;
                      }
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex mb-3 ${isSender ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isSender ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isSender
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted text-foreground rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                            
                            <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                              isSender ? 'justify-end' : 'justify-start'
                            }`}>
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isSender && (
                                <div className="ml-1">
                                  {isRead ? (
                                    <CheckCheck className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Message Input */}
            <div className="flex-shrink-0 p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full"
                  disabled={loading}
                />
                <Button type="submit" disabled={!newMessage.trim() || loading} className="rounded-full h-10 w-10 p-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
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
    </>
  );
}