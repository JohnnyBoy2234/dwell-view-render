import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { cn } from '@mzanzihomes/common/lib/utils';
import SupportTicketForm from './SupportTicketForm';

// Routes where the chat bubble should be hidden. Application routes are
// included because the launcher's corner position overlaps card CTAs and the
// wizard's Next/Submit buttons; support stays reachable via the Support page.
const HIDDEN_ROUTE_PREFIXES = [
  '/messages',
  '/tenant/messages',
  '/admin',
  '/MzanziHomes-lease/',
  '/lease/builder',
  '/lease/wizard',
  '/lease/sign',
  '/rental-application',
  '/apply/invite',
  '/application/',
  '/tenant/applications',
  '/tenant-dashboard/applications',
  '/landlord/dashboard/applications',
];
const HIDDEN_ROUTE_PATTERNS = [
  /\/leases\/.+\/sign/,
  /\/contracts\/.+\/sign/,
  /\/sign$/,
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_REPLIES = [
  'How do I list a property?',
  'Deposit rules',
  'Notice periods',
  'Viewing requests',
  'Signing a lease',
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function AISupportChat() {
  const { pathname } = useLocation();
  const isHidden =
    HIDDEN_ROUTE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)) ||
    HIDDEN_ROUTE_PATTERNS.some(r => r.test(pathname));

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [escalationDone, setEscalationDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showNudge, showForm]);

  // Focus input when panel opens
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Abort any in-flight stream on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setIsStreaming(true);
    setShowNudge(false);
    setShowForm(false);

    // Add empty assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      abortRef.current = new AbortController();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-support-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: abortRef.current.signal,
        body: JSON.stringify({ messages: next }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Sorry, I couldn't connect right now. Try again or use the 'Still need help?' link below.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setShowNudge(true);
      setShowForm(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const lastAiMessage =
    messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';

  if (isHidden) return null;

  // Render through a portal to <body> so the fixed positioning is always
  // relative to the viewport — never trapped by a transformed/filtered ancestor
  // (which was pinning the bubble to the top-right corner).
  return createPortal(
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Button
          aria-label="Open support chat"
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/30',
            'bg-gradient-to-br from-primary to-primary/80',
            'hover:scale-105 active:scale-95 transition-transform',
            // Mobile: hug the tab bar (60px bar + 12px gap + safe area) instead
            // of floating high over the content.
            'bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6'
          )}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-50 flex flex-col bg-background overflow-hidden',
            // Mobile: full-width bottom sheet — use dvh so it doesn't go behind browser chrome/keyboard
            'bottom-0 left-0 right-0 rounded-t-2xl',
            // Desktop: anchored card
            'md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:h-[560px] md:rounded-2xl',
            'shadow-2xl shadow-black/20 border border-border/50'
          )}
          style={{ height: 'min(82dvh, 82vh)' } as React.CSSProperties}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-none">MzanziHomes AI</p>
                <p className="text-xs opacity-80 mt-0.5">
                  {isStreaming ? 'Typing…' : 'Ask me anything'}
                </p>
              </div>
            </div>
            <Button
              aria-label="Close support chat"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-primary-foreground/20 text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 px-4 py-3 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm py-4">
                  <p className="mb-1 text-base font-medium text-foreground">Hi there 👋</p>
                  <p>I know MzanziHomes inside-out and SA rental law. What can I help with?</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REPLIES.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className={cn(
                        'rounded-full border border-border/60 bg-background px-3 py-1.5',
                        'text-sm text-foreground/80 hover:bg-muted transition-colors',
                        'cursor-pointer'
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      )}
                    >
                      {msg.content || (
                        <span className="flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Escalation nudge — shown after AI response */}
                {showNudge && !showForm && !escalationDone && (
                  <div className="pl-1">
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline cursor-pointer"
                      onClick={() => { setShowNudge(false); setShowForm(true); }}
                    >
                      Still need help? Talk to us →
                    </button>
                  </div>
                )}

                {/* Escalation form — shown after nudge is clicked */}
                {showForm && !escalationDone && (
                  <SupportTicketForm
                    prefillMessage={lastAiMessage ? `Context from AI chat:\n${lastAiMessage}` : ''}
                    onSubmit={() => {
                      setShowForm(false);
                      setEscalationDone(true);
                    }}
                    onCancel={() => { setShowForm(false); setShowNudge(true); }}
                  />
                )}

                {escalationDone && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    Ticket submitted. We'll be in touch soon.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Input bar */}
          <div
            className="px-4 pt-3 border-t border-border/50 shrink-0 md:pb-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
          >
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question…"
                disabled={isStreaming}
                className={cn(
                  'flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none',
                  'placeholder:text-muted-foreground/60',
                  'disabled:opacity-50'
                )}
              />
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={isStreaming || !input.trim()}
                className="h-9 w-9 rounded-full shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
