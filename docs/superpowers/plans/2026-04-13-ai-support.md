# AI Support Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing basic AI chat widget with a world-class Intercom-style floating support experience powered by Claude, covering MzanziHomes features and South African rental law, with inline ticket escalation wired to the existing admin panel.

**Architecture:** Upgrade the existing `ai-support-chat` Supabase edge function to call Claude API with a rich system prompt. Completely redesign `AISupportChat.tsx` into a polished responsive widget (mobile bottom sheet / desktop bottom-right card) with streaming AI responses and an inline escalation form. Wire a new `/admin/support` route to the already-built `SupportMessagesAdmin` component.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Supabase Edge Functions, Anthropic SDK (`npm:@anthropic-ai/sdk`), Vitest + React Testing Library

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `supabase/functions/ai-support-chat/index.ts` | Switch from Lovable/Gemini to Claude API; expand system prompt |
| Modify | `src/components/support/AISupportChat.tsx` | Full redesign — Intercom UI, raw-text stream parser, escalation |
| Create | `src/components/support/SupportTicketForm.tsx` | Inline escalation form using existing `support_messages` table |
| Modify | `src/App.tsx` | Add `/admin/support` route |
| Modify | `src/components/admin/AdminSidebar.tsx` | Add Support Tickets nav item |

---

## Task 1: Upgrade `ai-support-chat` Edge Function to Claude API

**Files:**
- Modify: `supabase/functions/ai-support-chat/index.ts`

- [ ] **Step 1: Replace the entire edge function with the Claude-powered version**

Replace the full contents of `supabase/functions/ai-support-chat/index.ts` with:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the MzanziHomes AI Support assistant. MzanziHomes is a South African property rental platform connecting landlords and tenants.

YOUR ROLE: Answer questions about MzanziHomes features and South African rental law. Be concise, helpful, and friendly. Use plain language.

--- MZANZIHOMES FEATURES ---

LISTING A PROPERTY (Landlords):
- Click "List Property" from the dashboard
- Upload photos, set price, add description and amenities
- Properties appear to tenants after submission

TENANT APPLICATIONS:
- Tenants browse and apply for properties
- Landlords review applications under the "Applications" tab
- Accept or decline with one click

VIEWING REQUESTS:
- Tenants request viewings from the property page
- A conversation is opened between tenant and landlord to schedule
- Landlords can propose times; tenants confirm

DOCUMENTS & LEASES:
- Upload and sign lease agreements digitally
- DocuSign integration for legally binding signatures
- Download documents from the Documents section

PAYMENTS:
- Powered by Paystack
- Landlords set up a Paystack subaccount to receive rent
- Tenants pay rent directly through the app
- Deposits are tracked and returned via the platform

PROFILE & VERIFICATION:
- Update display name, phone, bio, and avatar in Profile settings
- Email verification required to use key features

--- SOUTH AFRICAN RENTAL LAW ---

RENTAL HOUSING ACT (50 of 1999):
- Governs all residential leases in South Africa
- Landlords must provide a habitable, safe property
- Tenants must pay rent on time and not damage the property
- Both parties can approach the Rental Housing Tribunal for disputes (free service)

DEPOSITS:
- Maximum deposit is 2 months' rent
- Must be placed in an interest-bearing bank account
- Landlord must provide proof of the account and interest earned
- After lease ends: 14 days to refund if no damage; 21 days if deductions are made (with itemised list)
- Deductions must be for actual damage beyond fair wear and tear

NOTICE PERIODS:
- Month-to-month lease: minimum 1 calendar month written notice from either party
- Fixed-term lease: cannot be terminated early without agreement or breach of contract
- Landlord cannot increase rent without giving 1 month's written notice

TPN (TENANT PROFILE NETWORK):
- South Africa's rental credit bureau
- Landlords can request credit checks on applicants (standard practice)
- Records: payment history, previous evictions, judgments
- Tenants can request their own TPN report

PIE ACT (Prevention of Illegal Eviction Act, 19 of 1998):
- Landlords CANNOT evict tenants without a court order
- No self-help evictions: changing locks, removing belongings, or cutting utilities are illegal
- Eviction process: issue notice → apply to Magistrate's Court → court date → sheriff serves order

MAINTENANCE:
- Landlord responsible: structural repairs, roof, plumbing, electrical, geysers
- Tenant responsible: day-to-day upkeep, reporting issues promptly, not causing damage
- Tenant cannot withhold rent due to maintenance issues (must use legal channels)

RENTAL HOUSING TRIBUNAL:
- Free dispute resolution service in every province
- Handles: deposit disputes, lease violations, maintenance disputes, unfair rental increases
- File a complaint at your provincial Tribunal office

--- GUIDELINES ---
- For account-specific issues, suggest the "Still need help?" link to submit a support ticket
- For complex legal disputes, recommend consulting a qualified attorney or the Rental Housing Tribunal
- Stay on topic — only discuss MzanziHomes and SA rental matters
- Keep responses concise (3-5 sentences where possible)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages,
          });

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in ai-support-chat:', error);
    const status = (error as any)?.status === 429 ? 429 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Set the Anthropic API key as a Supabase secret**

```bash
cd c:\Users\Jonathan\ D\ Theron\dwell-view-render
npx supabase secrets set ANTHROPIC_API_KEY=<your_anthropic_api_key>
```

Get the key from https://console.anthropic.com/settings/keys

- [ ] **Step 3: Deploy the updated function**

```bash
npx supabase functions deploy ai-support-chat
```

Expected output: `Deployed Function ai-support-chat`

- [ ] **Step 4: Smoke-test the function**

```bash
curl -X POST https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/ai-support-chat \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the maximum deposit a landlord can charge?"}]}'
```

Expected: streaming text response about 2 months deposit.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/ai-support-chat/index.ts
git commit -m "feat: upgrade ai-support-chat to Claude API with SA rental law system prompt"
```

---

## Task 2: Create `SupportTicketForm` Component

**Files:**
- Create: `src/components/support/SupportTicketForm.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/support/__tests__/SupportTicketForm.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SupportTicketForm from '../SupportTicketForm';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '123' }, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', user_metadata: { display_name: 'Test User' } },
  }),
}));

describe('SupportTicketForm', () => {
  it('calls onSubmit after successful form submission', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<SupportTicketForm onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.change(screen.getByPlaceholderText(/describe your issue/i), {
      target: { value: 'My payment is not showing up' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  });

  it('renders cancel button and calls onCancel when clicked', () => {
    const onCancel = vi.fn();
    render(<SupportTicketForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd c:\Users\Jonathan\ D\ Theron\dwell-view-render
npm run test -- src/components/support/__tests__/SupportTicketForm.test.tsx
```

Expected: FAIL — `SupportTicketForm` not found.

- [ ] **Step 3: Create `SupportTicketForm.tsx`**

Create `src/components/support/SupportTicketForm.tsx`:

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupportTicketFormProps {
  /** Pre-populate the message field (e.g. conversation summary) */
  prefillMessage?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function SupportTicketForm({
  prefillMessage = '',
  onSubmit,
  onCancel,
}: SupportTicketFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState(
    user?.user_metadata?.display_name || ''
  );
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState(prefillMessage);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        subject: 'Support request via AI chat',
        message: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        category: 'general',
        priority: 'medium',
      };
      if (user?.id) payload.user_id = user.id;

      const { error } = await supabase
        .from('support_messages')
        .insert(payload as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Support ticket submitted. We\'ll get back to you soon.');
      onSubmit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-muted/40 rounded-xl border border-border/50">
      <p className="text-sm font-medium text-foreground">Send us a message</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="ticket-name" className="text-xs text-muted-foreground">Name</Label>
          <Input
            id="ticket-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="ticket-email" className="text-xs text-muted-foreground">Email</Label>
          <Input
            id="ticket-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ticket-message" className="text-xs text-muted-foreground">Message</Label>
        <Textarea
          id="ticket-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue..."
          className="text-sm resize-none"
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !message.trim()}
          className="gap-1"
        >
          {submitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Send
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/components/support/__tests__/SupportTicketForm.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/support/SupportTicketForm.tsx src/components/support/__tests__/SupportTicketForm.test.tsx
git commit -m "feat: add SupportTicketForm for AI chat escalation"
```

---

## Task 3: Redesign `AISupportChat.tsx` — Intercom-Style UI

**Files:**
- Modify: `src/components/support/AISupportChat.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/support/__tests__/AISupportChat.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AISupportChat } from '../AISupportChat';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

// Mock fetch for streaming
const mockStream = (text: string) => {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return Promise.resolve({
    ok: true,
    body: readable,
  } as Response);
};

describe('AISupportChat', () => {
  it('renders floating button by default', () => {
    render(
      <BrowserRouter>
        <AISupportChat />
      </BrowserRouter>
    );
    expect(screen.getByRole('button', { name: /support/i })).toBeInTheDocument();
  });

  it('opens chat panel when button is clicked', async () => {
    render(
      <BrowserRouter>
        <AISupportChat />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /support/i }));
    expect(screen.getByText(/MzanziHomes AI/i)).toBeInTheDocument();
  });

  it('closes panel when X button is clicked', async () => {
    render(
      <BrowserRouter>
        <AISupportChat />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /support/i }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(screen.queryByText(/MzanziHomes AI/i)).not.toBeInTheDocument()
    );
  });

  it('sends a quick-reply message when chip is clicked', async () => {
    global.fetch = vi.fn(() => mockStream('Deposits can be up to 2 months rent.')) as any;

    render(
      <BrowserRouter>
        <AISupportChat />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /support/i }));
    fireEvent.click(screen.getByText(/Deposit rules/i));

    await waitFor(() =>
      expect(screen.getByText(/Deposit rules/i)).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- src/components/support/__tests__/AISupportChat.test.tsx
```

Expected: Some FAIL (tests reference updated button aria-label and panel content).

- [ ] **Step 3: Replace `AISupportChat.tsx` with the new design**

Replace the full contents of `src/components/support/AISupportChat.tsx` with:

```typescript
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import SupportTicketForm from './SupportTicketForm';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationDone, setEscalationDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showEscalation]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setIsStreaming(true);
    setShowEscalation(false);

    // Add empty assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-support-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
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
      setShowEscalation(true);
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

  return (
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
            'bottom-20 right-4 md:bottom-6 md:right-6'
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
            // Mobile: full-width bottom sheet
            'bottom-0 left-0 right-0 rounded-t-2xl h-[82vh]',
            // Desktop: anchored card
            'md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:h-[560px] md:rounded-2xl',
            'shadow-2xl shadow-black/20 border border-border/50'
          )}
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
          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
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

                {/* Escalation nudge after last AI response */}
                {showEscalation && !escalationDone && (
                  <div className="pl-1">
                    <button
                      onClick={() => setShowEscalation(false) || setShowEscalation(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Still need help?{' '}
                      <span
                        className="underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEscalation(false);
                          // re-show form below
                          setTimeout(() => setShowEscalation(true), 0);
                        }}
                      >
                        Talk to us →
                      </span>
                    </button>
                  </div>
                )}

                {/* Inline escalation form */}
                {showEscalation && !escalationDone && messages.length > 0 && (
                  <SupportTicketForm
                    prefillMessage={lastAiMessage ? `Context from AI chat:\n${lastAiMessage}` : ''}
                    onSubmit={() => {
                      setShowEscalation(false);
                      setEscalationDone(true);
                    }}
                    onCancel={() => setShowEscalation(false)}
                  />
                )}

                {escalationDone && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    Ticket submitted. We'll be in touch soon.
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-border/50 shrink-0">
            {messages.length > 0 && !showEscalation && !escalationDone && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 block"
                onClick={() => setShowEscalation(true)}
              >
                Still need help? Talk to us →
              </button>
            )}
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
    </>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/components/support/__tests__/AISupportChat.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/support/AISupportChat.tsx
git commit -m "feat: redesign AISupportChat with Intercom-style UI, mobile bottom sheet, escalation"
```

---

## Task 4: Add Admin Support Route and Sidebar Item

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Add the `/admin/support` route in `src/App.tsx`**

Find the block of admin routes (around line 191–205) and add this route after the reports route:

```typescript
// After the existing /admin/reports route:
<Route path="/admin/support" element={
  <AdminLayout>
    <SupportMessagesAdmin />
  </AdminLayout>
} />
```

Also add the import at the top of App.tsx with the other admin imports:

```typescript
import SupportMessagesAdmin from "@/components/admin/SupportMessagesAdmin";
```

- [ ] **Step 2: Add "Support Tickets" to `AdminSidebar.tsx`**

Open `src/components/admin/AdminSidebar.tsx`. Add `HeadphonesIcon` to the lucide-react import:

```typescript
import { FileText, Users, Shield, LogOut, Home, Building, Flag, LayoutDashboard, Headphones } from 'lucide-react';
```

Add a new entry to the `adminItems` array after the Reports entry:

```typescript
{ title: 'Support Tickets', url: '/admin/support', icon: Headphones },
```

- [ ] **Step 3: Verify the app compiles**

```bash
cd c:\Users\Jonathan\ D\ Theron\dwell-view-render
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/admin/AdminSidebar.tsx
git commit -m "feat: add /admin/support route and sidebar nav item for Support Tickets"
```

---

## Self-Review Checklist

- [x] **Spec coverage — Widget UI:** Floating button, gradient header, quick-reply chips, message thread, input bar, escalation nudge — all implemented in Task 3.
- [x] **Spec coverage — AI backend:** Claude API via upgraded edge function in Task 1. SA rental law + MzanziHomes features in system prompt.
- [x] **Spec coverage — Escalation:** Inline `SupportTicketForm` → inserts to existing `support_messages` table. Implemented in Tasks 2 & 3.
- [x] **Spec coverage — Admin:** `/admin/support` route + sidebar item wired to existing `SupportMessagesAdmin`. Implemented in Task 4.
- [x] **Spec coverage — Mobile layout:** `h-[82vh] bottom-0 left-0 right-0 rounded-t-2xl` on mobile, `md:w-[380px] md:h-[560px] md:rounded-2xl md:bottom-6 md:right-6` on desktop.
- [x] **Spec coverage — Streaming:** Raw text stream (not SSE) — simpler decoder in frontend, matching new edge function output.
- [x] **No placeholders:** All code blocks are complete.
- [x] **Type consistency:** `Message` interface consistent across `AISupportChat.tsx`. `SupportTicketForm` props consistent between definition and usage.
- [x] **Reuses existing infrastructure:** `support_messages` table, `SupportMessagesAdmin`, existing `AISupportChat` mounting point in `App.tsx` — no new tables or routes duplicated.
