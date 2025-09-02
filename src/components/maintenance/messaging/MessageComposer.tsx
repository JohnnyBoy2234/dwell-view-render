import { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface MessageComposerProps {
  maxLength?: number;
  onSend: (body: string, files: File[]) => void;
  disabled?: boolean;
}

export function MessageComposer({ maxLength = 5000, onSend, disabled }: MessageComposerProps) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected.slice(0, 5));
  };

  const handleSend = () => {
    if (!body.trim()) return;
    onSend(body, files);
    setBody('');
    setFiles([]);
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply..."
        maxLength={maxLength}
        rows={3}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {body.length}/{maxLength}
        </div>
        <Input
          type="file"
          multiple
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        />
        <Button onClick={handleSend} disabled={disabled || body.length === 0}>
          Send
        </Button>
      </div>
    </div>
  );
}
