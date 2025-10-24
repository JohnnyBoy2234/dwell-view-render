import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMessageParsing } from '@/hooks/useMessageParsing';
import { MESSAGE_STYLES, BUTTON_LABELS, ARIA_LABELS } from '@/constants/messageConstants';

interface MessageContentProps {
  content: string;
  isOwn: boolean;
  isLandlord?: boolean;
}

/**
 * Component to render message content with link parsing and application invite handling
 */
export function MessageContent({ content, isOwn, isLandlord }: MessageContentProps) {
  const { textParts, urls, inviteUrl } = useMessageParsing({ content });

  const handleInviteClick = () => {
    if (inviteUrl) {
      try {
        window.location.href = inviteUrl;
      } catch (error) {
        console.error('Failed to navigate to invite URL:', error);
      }
    }
  };

  // Render content with inline links
  const renderContentWithLinks = () => {
    if (urls.length === 0) {
      return textParts[0];
    }

    const elements: (string | JSX.Element)[] = [];
    
    textParts.forEach((textPart, index) => {
      elements.push(textPart);
      
      if (index < urls.length) {
        const url = urls[index];
        elements.push(
          <a
            key={`link-${url.href}-${index}`}
            href={url.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline break-all',
              isOwn ? 'text-white' : 'text-primary'
            )}
            aria-label={`External link: ${url.href}`}
          >
            {url.href}
          </a>
        );
      }
    });

    return elements;
  };

  return (
    <div className="space-y-2 w-full">
      <div className={cn(
        "w-full",
        "break-words",
        "whitespace-pre-wrap",
        "overflow-hidden",
        "text-left"
      )}>
        {renderContentWithLinks()}
      </div>
      
      {inviteUrl && !isLandlord && (
        <div className="mt-2">
          <Button
            size="sm"
            className={cn(
              isOwn ? 'bg-white text-ios-blue hover:bg-white/90' : undefined
            )}
            onClick={handleInviteClick}
            aria-label={ARIA_LABELS.APPLICATION_INVITE}
          >
            {BUTTON_LABELS.START_APPLICATION}
          </Button>
        </div>
      )}
    </div>
  );
}