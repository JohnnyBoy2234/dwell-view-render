import { describe, it, expect } from 'vitest';
import { toMessageBubbleData } from './toMessageBubbleData';
import type { MaintenanceMessage } from '@mzanzihomes/common/types/maintenance';

const base: MaintenanceMessage = {
  id: 'm1',
  ticketId: 't1',
  senderUserId: 'u1',
  senderRole: 'TENANT',
  recipientUserId: 'u2',
  body: 'The tap is leaking',
  createdAt: '2026-07-01T10:00:00Z',
};

describe('toMessageBubbleData', () => {
  it('maps text content and sender so MessageBubble can render it', () => {
    const result = toMessageBubbleData(base);
    expect(result.content).toBe('The tap is leaking');
    expect(result.sender_id).toBe('u1');
    expect(result.created_at).toBe('2026-07-01T10:00:00Z');
    expect(result.message_type).toBe('text');
    expect(result.attachment_url).toBeNull();
  });

  it('marks a message with attachments as type "attachment" and uses the first url', () => {
    const result = toMessageBubbleData({
      ...base,
      attachments: ['https://x.co/a.jpg', 'https://x.co/b.jpg'],
    });
    expect(result.message_type).toBe('attachment');
    expect(result.attachment_url).toBe('https://x.co/a.jpg');
  });

  it('treats an empty attachments array as no attachment', () => {
    const result = toMessageBubbleData({ ...base, attachments: [] });
    expect(result.message_type).toBe('text');
    expect(result.attachment_url).toBeNull();
  });

  it('marks read status from readAt for both role fields', () => {
    expect(toMessageBubbleData(base).read_by_landlord).toBe(false);
    expect(toMessageBubbleData({ ...base, readAt: '2026-07-01T11:00:00Z' }).read_by_tenant).toBe(true);
  });
});
