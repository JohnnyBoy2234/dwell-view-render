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
    if (!content) return null;
    
    if (!textParts || textParts.length === 0) {
      return <span>{content}</span>;
    }

    if (urls.length === 0) {
      return <span>{textParts[0] || content}</span>;
    }

    const elements: (string | JSX.Element)[] = [];
    
    textParts.forEach((textPart, index) => {
      // Only push text part if it's not empty
      if (textPart) {
        elements.push(<span key={`text-${index}`}>{textPart}</span>);
      }
      
      // Add URL if it exists at this index
      if (index < urls.length && urls[index]) {
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

    return elements.length > 0 ? elements : <span>{content}</span>;
  };

  const contentToRender = renderContentWithLinks();
  
  if (!contentToRender) return null;

  return (
    <div className="space-y-2">
      <div className="break-words whitespace-pre-wrap">
        {Array.isArray(contentToRender) ? contentToRender : <>{contentToRender}</>}
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