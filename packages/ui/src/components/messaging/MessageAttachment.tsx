import { getAttachmentKind } from '@mzanzihomes/common/lib/utils';
import { FileText, FileSpreadsheet, FileArchive } from 'lucide-react';

interface MessageAttachmentProps {
  url: string;
}

const DOC_ICONS: Record<string, typeof FileText> = {
  '.xls': FileSpreadsheet,
  '.xlsx': FileSpreadsheet,
  '.csv': FileSpreadsheet,
  '.zip': FileArchive,
  '.rar': FileArchive,
  '.7z': FileArchive,
};

function extensionOf(url: string): string {
  const path = url.split(/[?#]/)[0];
  const match = /\.[a-z0-9]+$/i.exec(path);
  return match ? match[0].toLowerCase() : '';
}

/**
 * Single shared renderer for a chat message attachment, used by both the
 * property chat (WhatsAppStyleThread) and maintenance chat (MessageBubble).
 * Kind is inferred from the URL's extension -- attachment_url is the only
 * data stored per message (no original filename, size, or MIME type), so a
 * document card shows a generic label, not the file the user actually sent.
 */
export function MessageAttachment({ url }: MessageAttachmentProps) {
  const kind = getAttachmentKind(url);

  if (kind === 'image') {
    return (
      <div className="relative">
        <img
          src={url}
          alt="Shared image"
          className="max-w-[250px] max-h-[200px] rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => window.open(url, '_blank')}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-medium"
        >
          <span className="truncate max-w-[200px]">Image</span>
          <span className="text-[10px] opacity-70">Open</span>
        </a>
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="max-w-[250px] max-h-[200px] rounded-xl"
      />
    );
  }

  if (kind === 'audio') {
    return <audio src={url} controls className="w-full max-w-[250px]" />;
  }

  const ext = extensionOf(url);
  const Icon = DOC_ICONS[ext] ?? FileText;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-medium hover:bg-white/25 transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[180px]">Document{ext}</span>
      <span className="text-[10px] opacity-70">Open ↗</span>
    </a>
  );
}
