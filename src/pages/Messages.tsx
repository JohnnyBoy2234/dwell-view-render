import { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function Messages() {
  const { user, isLandlord } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    sendMessage,
    fetchMessages: refetchMessages
  } = useMessaging();

  const [newMessage, setNewMessage] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const [hasPrefilledMessage, setHasPrefilledMessage] = useState(false);
  const [hasProcessedUrlParam, setHasProcessedUrlParam] = useState(false);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingProposals, setViewingProposals] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const selectedConversation = conversations.find(c => c.id === activeConversation);

  // Fetch viewing proposals for active conversation
  useEffect(() => {
    if (activeConversation && user) {
      fetchViewingProposals();
    }
  }, [activeConversation, user]);

  const fetchViewingProposals = async () => {
    if (!activeConversation || !user) return;
    
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
      console.error('Error fetching viewing proposals:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Pre-fill message for first-time contact
  useEffect(() => {
    if (selectedConversation && messages.length === 0 && !isLandlord && !hasPrefilledMessage) {
      const propertyTitle = selectedConversation.properties?.title || 'this property';
      const autoMessage = `Hello, I am interested in ${propertyTitle}. I would like to schedule a viewing. Please let me know what times you have available.`;
      setNewMessage(autoMessage);
      setHasPrefilledMessage(true);
    } else if (selectedConversation && messages.length > 0 && hasPrefilledMessage) {
      // If messages exist, clear any pre-filled message
      setHasPrefilledMessage(false);
    }
  }, [selectedConversation, messages, isLandlord, hasPrefilledMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    await sendMessage(activeConversation, newMessage);
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="p-8 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign in to access messages</h2>
          <p className="text-muted-foreground">Connect with landlords and tenants</p>
        </Card>
      </div>
    );
  }

  const [searchParams] = useSearchParams();
  
  // Handle initial URL parameter only once
  useEffect(() => {
    if (hasProcessedUrlParam || conversations.length === 0) return;
    
    const cid = searchParams.get('c');
    console.log('🔗 Processing URL parameter:', cid);
    
    if (cid) {
      const exists = conversations.find(c => c.id === cid);
      if (exists) {
        console.log('✅ Setting conversation from URL:', cid);
        setActiveConversation(cid);
        setShowConversations(false);
        setHasPrefilledMessage(false);
        setHasProcessedUrlParam(true);
      }
    } else {
      setHasProcessedUrlParam(true);
    }
  }, [conversations, searchParams, hasProcessedUrlParam]);

  // Handle manual conversation switching
  const handleConversationClick = (conversationId: string) => {
    console.log('👆 Manual conversation switch to:', conversationId);
    setActiveConversation(conversationId);
    setShowConversations(false);
    
    // Clear URL parameter to prevent conflicts
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('c');
    navigate({ search: newSearchParams.toString() }, { replace: true });
  };

  return (
    <>
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-semibold">Conversations</h2>
      </div>
      <Badge variant="secondary" className="text-xs">
        {conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} unread
      </Badge>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-12rem)]">
      {/* Conversations List */}
      <div className={`${showConversations ? 'block' : 'hidden lg:block'} lg:col-span-1`}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                            
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Home className="h-3 w-3" />
                              <span className="truncate">{conversation.properties?.title}</span>
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
          </CardContent>
        </Card>
      </div>

      {/* Chat Window */}
      <div className={`${!showConversations ? 'block' : 'hidden lg:block'} lg:col-span-2`}>
        {selectedConversation ? (
          <Card className="h-full flex flex-col">
            {/* Chat Header */}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowConversations(true)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
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
              
              <Separator />
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                <span>{selectedConversation.properties?.title}</span>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[calc(100vh-24rem)] px-4">
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
                            <p className="text-xs text-muted-foreground">Create a viewing proposal for this tenant</p>
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

                    {/* Viewing Proposals */}
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
                          className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isSender ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                isSender
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
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
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </Card>
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