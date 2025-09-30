import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  maxLength?: number;
  onSend: (body: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  onCreateViewing?: () => void;
  showViewingButton?: boolean;
}

export function MessageComposer({ 
  maxLength = 5000, 
  onSend, 
  disabled,
  placeholder = "Type a message...",
  value: controlledValue,
  onChange: controlledOnChange,
  onFocus,
  autoFocus = false,
  onCreateViewing,
  showViewingButton = false
}: MessageComposerProps) {
  const [internalValue, setInternalValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = controlledOnChange || setInternalValue;

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected].slice(0, 5));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!value.trim() && files.length === 0) return;
    onSend(value.trim(), files);
    setValue('');
    setFiles([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3">
      {/* File Attachments */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 bg-white/90 border border-ocean-blue/15 rounded-xl px-3 py-2 text-sm shadow-soft animate-attachment-pop"
            >
              <Paperclip className="h-4 w-4 text-ocean-blue" />
              <span className="truncate max-w-[140px] text-ios-gray-dark font-medium">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className={cn(
        "flex items-end gap-2 p-2.5 bg-white/80 rounded-2xl border transition-all duration-300", 
        "backdrop-blur-md shadow-soft",
        // Always show ocean blue border, and enhance on focus
        "border-ocean-blue",
        isFocused && "ring-2 ring-ocean-blue/20",
        disabled && "opacity-60"
      )}>
        {showViewingButton && (
          <button
            onClick={onCreateViewing}
            className="text-muted-foreground hover:text-ocean-blue transition-colors p-2 rounded-full hover:bg-ocean-blue/10"
            disabled={disabled}
            title="Create viewing slot"
          >
            <Calendar className="h-5 w-5" />
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-muted-foreground hover:text-ocean-blue transition-colors p-2 rounded-full hover:bg-ocean-blue/10"
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={1}
          className={cn(
            "flex-1 min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent",
            "focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-2 text-[15px]",
            "placeholder:text-muted-foreground/60"
          )}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && files.length === 0)}
          size="icon"
          className={cn(
            "rounded-full h-11 w-11 p-0 transition-all duration-200", 
            (value.trim() || files.length > 0) 
              ? "bg-gradient-to-br from-ocean-blue to-ocean-blue-dark text-white shadow-pop hover:shadow-lg" 
              : "bg-muted text-muted-foreground hover:bg-muted scale-95"
          )}
        >
          <Send className="h-4 w-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
          className="hidden"
        />
      </div>

      {value.length > maxLength * 0.8 && (
        <div className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}
