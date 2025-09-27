import { useState, useRef, useEffect, useCallback } from 'react';
import { useOptimizedMessaging } from '@/hooks/messaging/useOptimizedMessaging';
import { useAuth } from '@/hooks/useAuth';
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
  Bell,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';

export default function OptimizedMessages() {
  const auth = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, isLandlord, authLoading } = auth || ({} as any);
  const [newMessage, setNewMessage] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const [hasPrefilledMessage, setHasPrefilledMessage] = useState(false);
  const [hasProcessedUrlParam, setHasProcessedUrlParam] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputFormRef = useRef<HTMLFormElement>(null);

  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    sendMessage,
    sendMessageWithAttachment,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error
  } = useOptimizedMessaging();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle initial URL parameter
  useEffect(() => {
    if (hasProcessedUrlParam || conversations.length === 0) return;
    
    const cid = searchParams.get('c');
    if (cid) {
      const exists = conversations.find(c => c.id === cid);
      if (exists) {
        setActiveConversation(cid);
        setShowConversations(false);
        setHasProcessedUrlParam(true);
      }
    } else {
      setHasProcessedUrlParam(true);
    }
  }, [conversations, searchParams, hasProcessedUrlParam]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || isSending) return;

    await sendMessage(activeConversation, newMessage);
    setNewMessage('');
    setHasPrefilledMessage(false);
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
    if (fullTitle.length <= 20) return fullTitle;
    
    const areaCityMatch = fullTitle.match(/([^,]+),\s*([^,]+)(?:,|$)/);
    if (areaCityMatch) {
      return areaCityMatch[1].trim();
    }
    
    return fullTitle.length > 20 ? fullTitle.substring(0, 20) + '...' : fullTitle;
  };

  const isMessageRead = (message: any) => {
    return isLandlord ? message.read_by_landlord : message.read_by_tenant;
  };

  const handleConversationClick = (conversationId: string) => {
    setActiveConversation(conversationId);
    setShowConversations(false);
    
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('c', conversationId);
    navigate({ search: newSearchParams.toString() }, { replace: true });
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

  if (auth && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="p-8 text-center bg-card rounded-lg border shadow-lg">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" />
          <h2 className="text-lg font-semibold mb-2">Loading messages...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  const selectedConversation = activeConversation ? conversations.find(c => c.id === activeConversation) : undefined;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="p-8 text-center bg-card rounded-lg border shadow-lg">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Failed to load messages</h2>
          <p className="text-muted-foreground mb-4">{error?.message || 'An error occurred'}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <>
        {showConversations && (
          <div className="min-h-screen bg-background">
            <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold">Messages</h1>
              </div>
              <div className="ml-auto">
                <Badge variant="secondary" className="text-xs">
                  {conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} unread
                </Badge>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col h-[calc(100vh-8rem)]">
              <div className="flex-1 min-h-0 overflow-auto">
                {isLoadingConversations ? (
                  <div className="space-y-4 p-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <div>
                      <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
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

        {/* Chat Window - Mobile Full Screen */}
        {!showConversations && selectedConversation && (
          <div className="fixed inset-0 bg-background flex flex-col z-30 pt-20">
            <div className="fixed top-0 left-0 right-0 flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur-sm z-50 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowConversations(true);
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
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 pt-4">
              {isLoadingMessages ? (
                <div className="space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <Skeleton className="h-10 w-3/4 max-w-sm rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm break-words">{message.content}</p>
                        <div className={`flex items-center gap-1 text-xs mt-1 ${
                          message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
                          {message.sender_id === user?.id && (
                            isMessageRead(message) ? (
                              <CheckCheck className="h-3 w-3 text-green-400" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4 bg-background/95 backdrop-blur">
              <form ref={inputFormRef} onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" disabled={!newMessage.trim() || isSending} size="sm">
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop layout (simplified for now)
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Messages</h1>
          {isLoadingConversations && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <div className="bg-card rounded-lg border p-4">
            <h2 className="font-semibold mb-4">Conversations</h2>
            {isLoadingConversations ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const otherUser = getOtherUser(conversation);
                  const isOnline = onlineUsers.has(otherUser.id);
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        activeConversation === conversation.id
                          ? 'bg-primary/10 border-2 border-primary/20'
                          : 'hover:bg-muted/50'
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
                            <p className="font-medium text-sm truncate">{otherUser.name}</p>
                            {conversation.unread_count && conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {getShortPropertyInfo(conversation)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2 bg-card rounded-lg border flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getOtherUser(selectedConversation).name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{getOtherUser(selectedConversation).name}</h3>
                      <p className="text-sm text-muted-foreground">{getShortPropertyInfo(selectedConversation)}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="space-y-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                          <Skeleton className="h-12 w-2/3 max-w-sm rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}>
                            <p className="break-words">{message.content}</p>
                            <div className={`flex items-center gap-2 text-xs mt-2 ${
                              message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              <Clock className="h-3 w-3" />
                              <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
                              {message.sender_id === user?.id && (
                                isMessageRead(message) ? (
                                  <CheckCheck className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={isSending}
                    />
                    <Button type="submit" disabled={!newMessage.trim() || isSending}>
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}