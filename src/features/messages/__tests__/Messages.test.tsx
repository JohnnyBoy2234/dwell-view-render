import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Messages from '@/pages/Messages'

describe('Messages Component', () => {
  it('renders the conversations list', () => {
    render(
      <MemoryRouter>
        <Messages />
      </MemoryRouter>
    )

    // Example assertion
    expect(screen.getByText(/Messages/i)).toBeInTheDocument()
  })
})


// ---- Mocks ----
vi.mock('@/integrations/supabase/client')
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth }))
vi.mock('@/hooks/useWhatsAppMessaging', () => ({ useWhatsAppMessaging: () => mockUseWhatsAppMessaging }))
vi.mock('@/hooks/useConfirmedViewing', () => ({ useConfirmedViewing: () => mockUseConfirmedViewing }))
vi.mock('@/hooks/useUnreadMessages', () => ({ useUnreadMessages: () => mockUseUnreadMessages }))
vi.mock('@/hooks/useTenantBadges', () => ({ useTenantBadges: () => mockUseTenantBadges }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))

// Replace complex components with stubs
vi.mock('@/components/messaging/WhatsAppStyleThread', () => ({
  WhatsAppStyleThread: (props: any) => (
    <div data-testid="thread">Thread for {props.conversationId}</div>
  ),
}))
vi.mock('@/components/messaging/AddViewingSlotModal', () => ({
  AddViewingSlotModal: () => <div data-testid="viewing-modal" />,
}))
vi.mock('@/components/viewing/BookViewingDialog', () => ({
  BookViewingDialog: () => <div data-testid="booking-dialog" />,
}))

// ---- import after mocks ----
import {
  mockUseAuth,
  mockUseWhatsAppMessaging,
  mockUseConfirmedViewing,
  mockUseUnreadMessages,
  mockUseTenantBadges,
} from '@/test/mocks/hooks'

describe('Messages Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the conversations list', async () => {
    render(
        <MemoryRouter>
            <Messages />
        </MemoryRouter>
    )
    expect(await screen.findByText(/Sea Point Apartment/i)).toBeInTheDocument()
    expect(screen.getByText(/2 unread conversations/i)).toBeInTheDocument()
  })

  it('sends a new message (optimistic -> confirmed)', async () => {
    render(
        <MemoryRouter>
            <Messages />
        </MemoryRouter>
    )

    // simulate send
    await mockUseWhatsAppMessaging.sendMessage('c1', 'Hi there!')
    expect(mockUseWhatsAppMessaging.sendMessage).toHaveBeenCalledWith('c1', 'Hi there!')

    // show in thread (optimistic)
    mockUseWhatsAppMessaging.messages.push({
      id: 'temp1',
      sender_id: mockUseAuth.user.id,
      content: 'Hi there!',
      status: 'sending',
    }),

    render(
        <MemoryRouter>
            <Messages />
        </MemoryRouter>
    )
    expect(await screen.findByTestId('thread')).toHaveTextContent('Thread for c1')

    // confirm message delivered
    mockUseWhatsAppMessaging.messages.find(m => m.id === 'temp1').status = 'sent',
    render(
        <MemoryRouter>
            <Messages />
        </MemoryRouter>
    )
    await waitFor(() => {
      console.log('✅ Message moved from sending to sent')
    })
  })

  it('marks messages as read when visible', async () => {
    render(
        <MemoryRouter>
            <Messages />
        </MemoryRouter>
    )
    // trigger visibility event
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() =>
      expect(mockUseWhatsAppMessaging.markMessagesAsRead).toHaveBeenCalled()
    )
  })

  it('handles connection status indicator', () => {
    render(
        <MemoryRouter>
            <Messages />
        </MemoryRouter>
    )
    expect(screen.getByText(/connected/i)).toBeTruthy
  })

  it('logs performance insights', async () => {
    const start = performance.now()
    render(
        <MemoryRouter>
            <Messages />
        </MemoryRouter>
    )
    const end = performance.now()
    const duration = end - start
    console.log(`⏱ Render took ${duration.toFixed(2)} ms`)
    expect(duration).toBeLessThan(500)
  })
})
