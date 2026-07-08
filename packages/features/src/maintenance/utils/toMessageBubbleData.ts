import type { MaintenanceMessage } from '@mzanzihomes/common/types/maintenance';
import type { Message } from '@mzanzihomes/common/types/message';

/**
 * MessageBubble expects the DB-shaped Message interface (content, sender_id,
 * created_at, message_type, attachment_url). MaintenanceMessage is a
 * different, camelCase client shape (body, senderUserId, createdAt,
 * attachments[]) -- passing one where the other is expected leaves every
 * field MessageBubble reads undefined, rendering an empty bubble.
 *
 * ponytail: attachments beyond the first are dropped here -- MessageBubble's
 * interface only carries one attachment_url. Widen this (and MessageBubble)
 * to attachment_urls[] if/when multi-attachment maintenance messages need to
 * show all of them, not just the first.
 */
export function toMessageBubbleData(msg: MaintenanceMessage): Message {
  const hasAttachment = !!msg.attachments && msg.attachments.length > 0;
  return {
    id: msg.id,
    sender_id: msg.senderUserId,
    content: msg.body,
    created_at: msg.createdAt,
    message_type: hasAttachment ? 'attachment' : 'text',
    attachment_url: hasAttachment ? msg.attachments![0] : null,
    read_by_landlord: !!msg.readAt,
    read_by_tenant: !!msg.readAt,
  };
}
