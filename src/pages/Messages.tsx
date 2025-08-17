import { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
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
  User,
  Clock,
  Check,
  CheckCheck,
  Building2,
  Users,
  CreditCard,
  Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { NavLink, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Messages() {
  const { user, isLandlord } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    sendMessage
  } = useMessaging();

  const [newMessage, setNewMessage] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    await sendMessage(activeConversation, newMessage);
    setNewMessage('');
  };

  const getOtherUser = (conversation: any) => {
    if (isLandlord) {
      // If current user is landlord, show tenant info
      return {
        id: conversation.tenant_id,
        name: conversation.tenant_profile?.display_name || 'Tenant',
        role: 'Tenant'
      };
    } else {
      // If current user is tenant, show landlord info
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

  const selectedConversation = conversations.find(c => c.id === activeConversation);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const cid = searchParams.get('c');
    if (cid) {
      const exists = conversations.find(c => c.id === cid);
      if (exists) {
        setActiveConversation(cid);
        setShowConversations(false);
      }
    }
  }, [searchParams, conversations]);

  // Render with responsive layout for landlords, without for tenants
  if (isLandlord) {
    return (
      <DashboardLayout title="Messages">
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
                                onClick={() => {
                                  setActiveConversation(conversation.id);
                                  setShowConversations(false);
                                }}
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
                            {messages.map((message) => {
                              const isSender = message.sender_id === user.id;
                              const isRead = isMessageRead(message);
                              
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
      </DashboardLayout>
    );
  }

  // Tenant view (existing layout)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Messages</h1>
          </div>
          <Badge variant="secondary">
            {conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} unread
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
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
                <ScrollArea className="h-[calc(100vh-16rem)]">
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
                            onClick={() => {
                              setActiveConversation(conversation.id);
                              setShowConversations(false);
                            }}
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
                  <ScrollArea className="h-[calc(100vh-20rem)] px-4">
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
                        {messages.map((message) => {
                          const isSender = message.sender_id === user.id;
                          const isRead = isMessageRead(message);
                          
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
      </div>
    </div>
  );
}