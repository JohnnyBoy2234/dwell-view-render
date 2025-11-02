import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AISupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPaidCustomer, setIsPaidCustomer] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const getButtonSize = useCallback(() => 56, []); // h-14 / w-14

  const getHorizontalMargin = useCallback(() => {
    if (typeof window === 'undefined') return 24;
    return window.innerWidth <= 768 ? 16 : 24;
  }, []);

  const getBottomSafeArea = useCallback(() => {
    if (typeof window === 'undefined') return 80;
    return window.innerWidth <= 768 ? 120 : 80;
  }, []);

  const clampPosition = useCallback(
    (x: number, y: number) => {
      if (typeof window === 'undefined') return { x, y };
      const buttonSize = getButtonSize();
      const margin = getHorizontalMargin();
      const bottomSafeArea = getBottomSafeArea();

      const minX = margin;
      const maxX = Math.max(margin, window.innerWidth - buttonSize - margin);
      const minY = margin;
      const maxY = Math.max(margin, window.innerHeight - bottomSafeArea - buttonSize);

      return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      };
    },
    [getBottomSafeArea, getButtonSize, getHorizontalMargin],
  );

  const getDefaultPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const buttonSize = getButtonSize();
    const margin = getHorizontalMargin();
    const bottomSafeArea = getBottomSafeArea();

    return clampPosition(
      window.innerWidth - buttonSize - margin,
      window.innerHeight - bottomSafeArea - buttonSize,
    );
  }, [clampPosition, getBottomSafeArea, getButtonSize, getHorizontalMargin]);

  // Load saved position or use defaults
  useEffect(() => {
    const saved = localStorage.getItem('aiChatPosition');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPosition(clampPosition(parsed.x, parsed.y));
    } else {
      setPosition(getDefaultPosition());
    }
  }, [clampPosition, getDefaultPosition]);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev.x, prev.y));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  // Show chat button to all users
  useEffect(() => {
    setIsPaidCustomer(true);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const quickActions = [
    "How do I create a lease?",
    "How do I add a property?",
    "Where do I view applications?",
    "What is SwiftBooks?",
    "How do I track payments?",
  ];

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support-chat`;
      
      console.log('Sending request to:', CHAT_URL);
      console.log('Messages:', [...messages, userMessage]);
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentPage: location.pathname,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat API error:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let buffer = '';

      console.log('Starting to read stream...');

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream ended');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk);
        buffer += chunk;
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          console.log('Processing line:', jsonStr);
          
          if (jsonStr === '[DONE]') {
            console.log('Stream completed');
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              console.log('Received content:', content);
              assistantMessage += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage,
                };
                return newMessages;
              });
            }
          } catch (e) {
            console.log('JSON parse error:', e, 'for line:', jsonStr);
            // Incomplete JSON, re-buffer
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (isOpen) return;
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [isOpen, position.x, position.y]);

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    setPosition(clampPosition(newX, newY));
  }, [clampPosition, dragStart.x, dragStart.y, isDragging]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    localStorage.setItem('aiChatPosition', JSON.stringify(position));
  }, [isDragging, position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    updateDragPosition(e.clientX, e.clientY);
  }, [updateDragPosition]);

  const handleMouseUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, [startDrag]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    e.preventDefault();
    updateDragPosition(touch.clientX, touch.clientY);
  }, [updateDragPosition]);

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [endDrag, handleMouseMove, handleMouseUp, handleTouchEnd, handleTouchMove, isDragging]);

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          className="fixed h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 transition-none"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-background border rounded-lg shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">RentLekker AI Support</h3>
                <p className="text-xs opacity-90">Ask me anything about RentLekker</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm">
                  <p className="mb-4">👋 Hi! I'm your RentLekker AI assistant.</p>
                  <p className="mb-4">Ask me anything about using the platform:</p>
                </div>
                <div className="space-y-2">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="w-full text-left justify-start text-sm h-auto py-2"
                      onClick={() => handleQuickAction(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t space-y-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder="Type your question..."
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
