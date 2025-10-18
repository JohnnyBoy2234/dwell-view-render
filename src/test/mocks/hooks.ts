export const mockUseAuth = {
    user: { id: 'tenant_1', email: 't@a.com' },
    isLandlord: false,
    authLoading: false,
  }
  
  export const mockUseWhatsAppMessaging = {
    conversations: [
      { id: 'c1', tenant_id: 'tenant_1', landlord_id: 'landlord_1',
        properties: { title: 'Sea Point Apartment' }, unread_count: 2 },
    ],
    activeConversation: 'c1',
    messages: [{ id: 'm1', content: 'Hello', sender_id: 'landlord_1', status: 'delivered' }],
    loading: false,
    connectionStatus: 'connected',
    onlineUsers: new Set(['landlord_1']),
    typingUsers: new Map(),
    sendMessage: vi.fn(async (_id, msg) => ({ ok: true, msg })),
    sendTypingIndicator: vi.fn(),
    fetchConversations: vi.fn(),
    fetchMessages: vi.fn(),
    markMessagesAsRead: vi.fn(),
  }
  
  export const mockUseConfirmedViewing = { confirmedViewing: null, loading: false }
  export const mockUseUnreadMessages = { unreadCount: 2 }
  export const mockUseTenantBadges = { badges: [], currentYearStars: 0 }
  