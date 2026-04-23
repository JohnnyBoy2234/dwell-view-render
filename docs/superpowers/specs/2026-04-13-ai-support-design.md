# MzanziHomes AI Support — Design Spec
**Date:** 2026-04-13  
**Status:** Approved

---

## Overview

A world-class AI support experience built into the MzanziHomes app. An Intercom-style floating chat widget powered by Claude (Anthropic) with a custom system prompt covering MzanziHomes features and South African rental law. Unresolved issues escalate to tickets stored in the existing Supabase backend and surfaced in the admin panel.

---

## Goals

- Give landlords and tenants instant, accurate answers without leaving the app
- Cover MzanziHomes feature help + SA rental law (Rental Housing Act, deposits, TPN, PIE Act)
- Escalate to a human support ticket when AI isn't enough
- Zero third-party platform dependency — fully owned, no monthly SaaS fee

---

## User Experience

### Widget

A floating action button sits fixed at bottom-right on every page (z-50, above mobile nav bar). On click, a chat panel opens:

**Desktop:** Fixed card, 380px wide, anchored bottom-right, max-height 560px  
**Mobile:** Bottom sheet sliding up, covering ~80% of the screen height

### Chat Panel

- **Header:** "MzanziHomes AI" label + small brand avatar + close (×) button
- **Quick-reply chips** (shown when thread is empty):
  - "How do I list a property?"
  - "Viewing requests"
  - "Lease agreements"
  - "Payments & deposits"
- **Message thread:** User bubbles right-aligned, AI bubbles left-aligned. AI responses stream token-by-token with a typing indicator while fetching.
- **Input bar:** Text field + send button, sticky at the bottom of the panel.
- **Escalation nudge:** After every AI response, a small secondary link: _"Still need help? Talk to us →"_ Opens the escalation form inline within the panel.

### Escalation Form (inline, inside the widget)

Fields:
- Name (pre-filled from profile if logged in)
- Email (pre-filled if logged in)
- Message (textarea, pre-populated with the current conversation summary)
- Submit button → creates `support_tickets` row + closes form with success state

### Admin: Support Tickets Page

New page at `/admin/support` added to the existing admin panel:
- Table view: ticket ID, name, email, preview of message, status badge (Open / In Progress / Resolved), created date
- Click a row to expand full message
- Status dropdown to update (Open → In Progress → Resolved)
- New sidebar item: "Support Tickets" with a badge showing open ticket count

---

## Architecture

### Frontend Components

| File | Purpose |
|---|---|
| `src/components/support/SupportWidget.tsx` | Floating button + panel container, manages open/close state |
| `src/components/support/SupportChat.tsx` | Message list, streaming handler, quick-reply chips, input bar |
| `src/components/support/SupportTicketForm.tsx` | Escalation form, submits to `support_tickets` table |
| `src/pages/admin/SupportTickets.tsx` | Admin table view of all tickets with status management |

### Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Mount `<SupportWidget />` outside `<Routes>` so it persists across navigation |
| `src/components/admin/AdminSidebar.tsx` | Add "Support Tickets" nav item with open-ticket count badge |
| `src/App.tsx` (router) | Add `/admin/support` route |

### Backend

**Edge Function:** `supabase/functions/support-chat/index.ts`
- Accepts: `{ messages: { role: 'user' | 'assistant', content: string }[] }`
- Calls Anthropic Claude API (`claude-haiku-4-5`) with streaming enabled
- Returns: streamed text response via `TransformStream`
- System prompt (baked in): MzanziHomes feature reference + SA rental law summary
- Auth: public (no auth token required — support must work for logged-out users too)

**New Table:** `support_tickets`
```sql
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'open', -- open | in_progress | resolved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**RLS Policies:**
- `INSERT`: anyone (anon + authenticated) — so logged-out users can submit tickets
- `SELECT / UPDATE`: authenticated users with `admin` role only

---

## AI System Prompt Scope

The system prompt covers two domains:

**MzanziHomes Features:**
- Listing a property (steps, requirements, photos)
- Tenant applications and screening
- Viewing requests and scheduling
- Document management
- Payments (Paystack integration, deposit handling)
- Profile and verification
- Admin and reporting

**South African Rental Law:**
- Rental Housing Act 50 of 1999 (key tenant/landlord rights)
- Deposit rules: max 2 months, interest-bearing account, refund timelines
- Notice periods: 1 calendar month minimum
- TPN credit checks: what they cover, how to request
- PIE Act: eviction process basics, prohibited self-help evictions
- Municipal utility responsibilities

The system prompt explicitly instructs Claude to: stay on these topics, recommend consulting a lawyer for specific legal advice, and escalate to a human for account-specific issues.

---

## State Management

- Chat history lives in component state (`useState`) — no persistence for anonymous users
- For authenticated users: optionally save thread to a `support_chats` table (out of scope for v1 — can be added later)
- Ticket submission uses a direct Supabase client call (no edge function needed)

---

## Error Handling

- **Streaming failure:** Show "Something went wrong. Please try again." inline in the chat, preserve conversation history
- **Ticket submit failure:** Show inline error in the form, keep form data intact
- **Rate limiting:** Edge function returns 429 → show "Our AI is busy right now. Try again in a moment or send us a ticket."

---

## Out of Scope (v1)

- Chat history persistence for logged-in users
- Admin replying to tickets from the panel (reply via email for now)
- Read receipts or live agent chat
- File/image attachments in the widget
- Multi-language support
