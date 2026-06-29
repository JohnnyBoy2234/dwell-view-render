import { useState, ChangeEvent, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, X, Calendar } from 'lucide-react';
import { cn } from '@mzanzihomes/common/lib/utils';

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
  placeholder = 'Type a message…',
  value: controlledValue,
  onChange: controlledOnChange,
  onFocus,
  autoFocus = false,
  onCreateViewing,
  showViewingButton = false,
}: MessageComposerProps) {
  const [internalValue, setInternalValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = controlledOnChange || setInternalValue;

  // Auto-grow textarea height
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  // Adjust on value change
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!value.trim() && files.length === 0) return;
    // Spring animation on send button
    setIsSending(true);
    setTimeout(() => setIsSending(false), 320);
    onSend(value.trim(), files);
    setValue('');
    setFiles([]);
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = value.trim().length > 0 || files.length > 0;

  return (
    <div className="space-y-2.5">
      {/* File attachments */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-white/95 border border-white/60 rounded-xl px-3 py-1.5 text-sm shadow-ios-xs animate-attachment-pop"
            >
              <Paperclip className="h-3.5 w-3.5 text-ocean-blue shrink-0" />
              <span className="truncate max-w-[130px] text-ios-gray-dark text-xs font-medium">
                {file.name}
              </span>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        className={cn(
          'flex items-end gap-2 pl-2 pr-2 py-2 rounded-2xl border transition-all duration-250',
          'bg-white/96 backdrop-blur-sm',
          isFocused
            ? 'border-ocean-blue/40 shadow-[0_0_0_3px_rgba(37,99,235,0.10)]'
            : 'border-black/8 shadow-ios-sm',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0 pb-[2px]">
          {showViewingButton && (
            <button
              onClick={onCreateViewing}
              disabled={disabled}
              title="Create viewing slot"
              className="p-2 rounded-full text-muted-foreground hover:text-ocean-blue hover:bg-ocean-blue/8 transition-all duration-150 active:scale-90"
            >
              <Calendar className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach file"
            className="p-2 rounded-full text-muted-foreground hover:text-ocean-blue hover:bg-ocean-blue/8 transition-all duration-150 active:scale-90"
          >
            <Paperclip className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Auto-growing textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => {
            setValue(e.target.value);
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent border-0 outline-none py-1.5 px-0',
            'text-[15px] leading-[1.45] text-foreground',
            'placeholder:text-muted-foreground/50',
            'scrollbar-none'
          )}
          style={{
            minHeight: '36px',
            maxHeight: '120px',
            overflowY: 'auto',
            fontFamily: 'inherit',
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !hasContent}
          className={cn(
            'shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 mb-[1px]',
            hasContent
              ? 'bg-gradient-to-br from-ocean-blue to-ocean-blue-dark text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] active:scale-90'
              : 'bg-black/6 text-muted-foreground/50',
            isSending && 'animate-send-press'
          )}
          aria-label="Send message"
        >
          <Send
            className={cn(
              'transition-all duration-200',
              hasContent ? 'h-4 w-4 translate-x-[1px]' : 'h-3.5 w-3.5'
            )}
          />
        </button>

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
        <p className="text-[11px] text-muted-foreground text-right pr-1">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
