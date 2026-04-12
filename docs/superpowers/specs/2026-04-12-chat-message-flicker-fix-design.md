# Chat Message Flicker Fix — Design Spec

**Date:** 2026-04-12  
**Status:** Approved

---

## Problem

When a user sends a message it flickers: appears, disappears, appears again (sometimes twice), then settles. This happens because three overlapping mechanisms fight over the `messages` state in `useWhatsAppMessaging.tsx`.

---

## Root Causes

### 1. Watchdog polling interval (primary cause)
A `setInterval` running every 2 000 ms calls `fetchMessages` whenever the cached message list hasn't changed in 3 seconds. `fetchMessages` immediately calls `setMessages(cache)` where the in-memory cache does **not** include the just-sent optimistic message. This causes the message to vanish, then reappear once the server fetch completes.

Location: `src/hooks/useWhatsAppMessaging.tsx` lines 651–666.

### 2. `fetchMessages` blindly overwrites state with cache
`fetchMessages` always starts with `setMessages(cached)` before fetching from the server. If the cache is stale (missing the optimistic message), this produces an intermediate state with the message absent.

Location: `src/hooks/useWhatsAppMessaging.tsx` lines 163–167.

### 3. Self-broadcast causes remove-then-re-add cycle
The chat broadcast channel is created with `{ broadcast: { self: true } }`, so the sender receives their own optimistic broadcast. The listener handles it by filtering out the tempId entry and re-inserting it — a remove + re-add that triggers an extra render cycle.

Location: `src/hooks/useWhatsAppMessaging.tsx` lines 592–610.

---

## Fix

All changes are confined to `src/hooks/useWhatsAppMessaging.tsx`.

### Fix 1 — Remove the watchdog interval

Delete the entire `useEffect` (lines 651–666) that contains the polling `setInterval`. Supabase realtime (broadcast channel + `useWebSocketConnection`) already delivers messages in real time. The watchdog was added as a dropout fallback but actively causes the flicker and is redundant.

### Fix 2 — Preserve optimistic messages in `fetchMessages`

After fetching server data, merge it with any currently-pending optimistic messages instead of replacing state outright:

- Collect optimistic messages from current state that are not yet confirmed by the server (i.e. their `id` starts with `temp_` or their `optimistic` flag is `true`).
- Build the new list as: `[...serverMessages, ...pendingOptimistics]`, sorted by `created_at`.
- The initial `setMessages(cache)` call is removed — do not set state from cache before the server responds.

This means:
- On first load (no cache): a single `setMessages` call once server data arrives.
- On subsequent loads (cache present): skip the intermediate `setMessages(cache)` step; go straight to server fetch and merge.

### Fix 3 — Skip existing messages in broadcast listener

In the `on('broadcast', 'new_message', ...)` handler, change the logic so that:

- If a message with the given `tempId` already exists in state **and** the incoming `msg.id` matches what's already stored (i.e. already confirmed), return `prev` unchanged — no remove, no re-add.
- If the message exists as optimistic (still has temp id), update its status in-place rather than removing and re-inserting.
- Only append as a new entry if neither condition matches (genuinely new message not yet in state).

---

## Files

| File | Action |
|------|--------|
| `src/hooks/useWhatsAppMessaging.tsx` | Modify — remove watchdog, fix fetchMessages merge, fix broadcast listener |

No other files change.

---

## What Does Not Change

- Optimistic insert on send (`setMessages(prev => [...prev, optimisticMessage])`)
- Supabase realtime subscription and `useWebSocketConnection`
- Broadcast to recipient (real-time delivery)
- LocalStorage cache writes
- `confirmMessage` / `sendMessage` flow
- `WhatsAppStyleThread` component
- All other hooks and components

---

## Expected Result

After the fix:
1. Message appears immediately when sent (optimistic) — no flicker.
2. Status updates from `sending` → `sent` → `delivered` / `read` without the message disappearing.
3. Messages from the other person appear in real time via the existing realtime subscription.
4. No polling loop running in the background.
