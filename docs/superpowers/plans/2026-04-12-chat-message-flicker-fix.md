# Chat Message Flicker Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the send-message flicker in the chat so messages appear once and stay, like WhatsApp.

**Architecture:** Three surgical edits to `src/hooks/useWhatsAppMessaging.tsx` — remove a polling watchdog that overwrites optimistic state, fix `fetchMessages` to merge rather than replace, and fix the broadcast listener to skip messages it already holds.

**Tech Stack:** React 18, TypeScript, Supabase realtime, Vite + Vitest

---

## Files

| File | Action |
|------|--------|
| `src/hooks/useWhatsAppMessaging.tsx` | Modify — 3 targeted edits |

---

### Task 1: Remove the watchdog polling interval

**Files:**
- Modify: `src/hooks/useWhatsAppMessaging.tsx:651-666`

The `setInterval` at line 651 calls `fetchMessages` every ~2–3 seconds and is the primary cause of the flicker. `fetchMessages` immediately overwrites `messages` state with stale cache, erasing the just-sent optimistic message. Supabase realtime already handles delivery — this polling loop is redundant.

- [ ] **Step 1: Delete the watchdog useEffect**

In `src/hooks/useWhatsAppMessaging.tsx`, delete lines 650–666 in their entirety (the comment line and the entire `useEffect`):

```tsx
  // Watchdog fallback for realtime dropouts: poll messages if no changes detected
  useEffect(() => {
    if (!activeConversation) return;
    let lastSeen = Date.now();
    const interval = setInterval(() => {
      // If we haven't received any new messages for a while, refresh
      // Using cache size change as a simple heuristic
      const cached = messagesCache.current.get(activeConversation) || [];
      const latestTime = cached.length > 0 ? new Date(cached[cached.length - 1].created_at).getTime() : 0;
      const elapsed = Date.now() - Math.max(lastSeen, latestTime);
      if (elapsed > 3000) {
        fetchMessages(activeConversation);
        lastSeen = Date.now();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeConversation, fetchMessages]);
```

After deletion, line 650 should be the start of `// Hydrate from localStorage on mount`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean compile).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWhatsAppMessaging.tsx
git commit -m "fix: remove polling watchdog that caused message flicker"
```

---

### Task 2: Fix `fetchMessages` to preserve optimistic messages

**Files:**
- Modify: `src/hooks/useWhatsAppMessaging.tsx:162-167` (remove eager cache set) and `src/hooks/useWhatsAppMessaging.tsx:207-218` (merge instead of replace)

Currently `fetchMessages` calls `setMessages(cached)` immediately when it starts, wiping any pending optimistic messages from state. Then after the server responds it calls `setMessages(optimisticMessages)` and `setMessages(updatedMessages)` — two more overwrites. The fix: remove the eager `setMessages(cached)` and use the functional `setMessages` form to merge server data with any still-pending optimistic messages.

- [ ] **Step 1: Remove the eager `setMessages(cached)` call**

Find and replace this block in `fetchMessages` (lines 163–167):

```tsx
      // Return cached messages immediately if available
      const cached = messagesCache.current.get(conversationId);
      if (cached && cached.length > 0) {
        setMessages(cached);
      }
```

Replace with (keep the cache read for use elsewhere in the function, just don't call `setMessages`):

```tsx
      // Pre-load from cache into ref only — do not overwrite state (would erase optimistic messages)
      const cached = messagesCache.current.get(conversationId);
      void cached; // referenced later via messagesCache.current
```

- [ ] **Step 2: Replace the two post-fetch `setMessages` calls with a single merge**

Find this block (lines 207–218):

```tsx
      messagesCache.current.set(conversationId, optimisticMessages);
      setMessages(optimisticMessages);

      // Mark messages as read immediately after loading
      await markMessagesAsRead(conversationId);
      
      // Update messages status to read for messages from other users
      const updatedMessages = optimisticMessages.map(msg => 
        msg.sender_id !== user.id ? { ...msg, status: 'read' as const } : msg
      );
      setMessages(updatedMessages);
      messagesCache.current.set(conversationId, updatedMessages);

      // Cache in localStorage
      try {
        localStorage.setItem(`messaging_messages_${conversationId}`, JSON.stringify(updatedMessages));
      } catch {}
```

Replace with:

```tsx
      // Mark messages as read before setting state
      await markMessagesAsRead(conversationId);

      // Build final server list with read status applied
      const serverMessages: OptimisticMessage[] = optimisticMessages.map(msg =>
        msg.sender_id !== user.id ? { ...msg, status: 'read' as const } : msg
      );

      // Merge: keep any optimistic messages not yet confirmed by the server
      const serverIds = new Set(serverMessages.map(m => m.id));
      setMessages(prev => {
        const pending = prev.filter(m => m.optimistic === true && !serverIds.has(m.id));
        const merged = [...serverMessages, ...pending].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return merged;
      });

      messagesCache.current.set(conversationId, serverMessages);

      // Cache in localStorage
      try {
        localStorage.setItem(`messaging_messages_${conversationId}`, JSON.stringify(serverMessages));
      } catch {}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean compile).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWhatsAppMessaging.tsx
git commit -m "fix: fetchMessages merges with optimistic messages instead of overwriting"
```

---

### Task 3: Fix broadcast listener to skip existing messages

**Files:**
- Modify: `src/hooks/useWhatsAppMessaging.tsx:595-606`

The broadcast channel uses `self: true`, so the sender receives their own optimistic broadcast. The listener enters the `if (msg.tempId)` branch, removes the optimistic message from state, then re-inserts it — a visible remove-then-re-add. The fix: detect when `tempId === id` (self-broadcast of an optimistic message) and update status in-place instead of removing and re-adding.

- [ ] **Step 1: Replace the broadcast listener's setMessages block**

Find this block (lines 595–606):

```tsx
            setMessages(prev => {
              // If this is a real message carrying tempId, drop the temp optimistic one
              if (msg.tempId) {
                const withoutTemp = prev.filter(m => m.tempId !== msg.tempId);
                if (withoutTemp.some(m => m.id === msg.id)) return withoutTemp; // already present
                const delivered: OptimisticMessage = { ...msg, tempId: msg.id, status: 'delivered' };
                return [...withoutTemp, delivered];
              }
              if (prev.some(m => m.id === msg.id || m.tempId === msg.id)) return prev;
              const optimistic: OptimisticMessage = { ...msg, tempId: msg.id, status: 'delivered' };
              return [...prev, optimistic];
            });
```

Replace with:

```tsx
            setMessages(prev => {
              // Case 1: Self-broadcast of our own optimistic message (tempId === id).
              // We already inserted it on send — update status in-place, never remove.
              if (msg.tempId === msg.id) {
                if (prev.some(m => m.tempId === msg.tempId)) {
                  return prev.map(m =>
                    m.tempId === msg.tempId ? { ...m, status: 'delivered' as const } : m
                  );
                }
                return prev;
              }
              // Case 2: Server confirmation broadcast (real id + tempId reference).
              // Replace the optimistic entry with the confirmed message.
              if (msg.tempId) {
                const withoutTemp = prev.filter(m => m.tempId !== msg.tempId);
                if (withoutTemp.some(m => m.id === msg.id)) return withoutTemp;
                const delivered: OptimisticMessage = { ...msg, tempId: msg.id, status: 'delivered' };
                return [...withoutTemp, delivered];
              }
              // Case 3: Message from the other user — add if not already present.
              if (prev.some(m => m.id === msg.id || m.tempId === msg.id)) return prev;
              const optimistic: OptimisticMessage = { ...msg, tempId: msg.id, status: 'delivered' };
              return [...prev, optimistic];
            });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean compile).

- [ ] **Step 3: Manual smoke test**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run dev
```

1. Open the app in the browser and navigate to Messages.
2. Open a conversation.
3. Type a message and press Send.
4. **Expected:** The message appears once and stays. No disappear/reappear. Status transitions from `sending` → `sent` without the bubble vanishing.
5. Have a second browser session (or another user) open the same conversation — confirm their messages appear in real time without needing to refresh.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWhatsAppMessaging.tsx
git commit -m "fix: broadcast listener updates status in-place, no remove-then-re-add flicker"
```
