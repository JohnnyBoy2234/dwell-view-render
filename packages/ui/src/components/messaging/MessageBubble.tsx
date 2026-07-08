import { cn } from "@mzanzihomes/common/lib/utils";
import useMessageStatus from "../../hooks/useMessageStatus";
import { useMessageFormatting } from "../../hooks/useMessageFormatting";
import { MessageContent } from "./MessageContent";
import { MessageAttachment } from "./MessageAttachment";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { MESSAGE_STYLES } from "@mzanzihomes/common/constants/messageConstants";
import type { MessageBubbleProps } from "@mzanzihomes/common/types/message";

/**
 * Message bubble component for maintenance messaging
 * Displays individual messages with proper styling, status indicators, and content parsing
 */
export function MessageBubble({
  message,
  currentUserId,
  isLandlord = false,
  showTime = false,
}: MessageBubbleProps) {
  const isOwn = message.sender_id === currentUserId;
  const isRead = isLandlord ? message.read_by_landlord : message.read_by_tenant;

  // Custom hooks for business logic
  const { displayTime } = useMessageFormatting({
    createdAt: message.created_at,
  });
  const { statusType, ariaLabel } = useMessageStatus({
    isOwn,
    isOptimistic: message.optimistic,
    isRead,
  });

  const hasAttachment =
    message.message_type === "attachment" && message.attachment_url;

  return (
    <div
      className={cn(
        "flex items-end gap-2 mb-2 w-full animate-message-incoming",
        isOwn ? "justify-end" : "justify-start"
      )}
      role="listitem"
    >
      <div
        className={cn(
          MESSAGE_STYLES.BUBBLE_BASE,
          isOwn ? MESSAGE_STYLES.OWN_MESSAGE : MESSAGE_STYLES.OTHER_MESSAGE,
          "text-sm"
        )}
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
      >
        {!isOwn && message.profiles?.display_name && (
          <div className="text-xs font-medium text-ios-blue mb-1">
            {message.profiles.display_name}
          </div>
        )}

        {hasAttachment && (
          <div className="mb-2">
            <MessageAttachment url={message.attachment_url!} />
          </div>
        )}

        {message.content && (
          <MessageContent
            content={message.content}
            isOwn={isOwn}
            isLandlord={isLandlord}
          />
        )}

        <div
          className={cn(
            MESSAGE_STYLES.TIMESTAMP_BASE,
            isOwn
              ? MESSAGE_STYLES.TIMESTAMP_OWN
              : MESSAGE_STYLES.TIMESTAMP_OTHER
          )}
        >
          <time dateTime={message.created_at}>{displayTime}</time>
          <MessageStatusIcon statusType={statusType} ariaLabel={ariaLabel} />
        </div>
      </div>
    </div>
  );
}
