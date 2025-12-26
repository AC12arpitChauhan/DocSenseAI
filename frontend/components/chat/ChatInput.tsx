'use client';

import * as React from 'react';
import { ArrowUp, Paperclip, AtSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onFileUpload?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSubmit,
  onFileUpload,
  isLoading = false,
  placeholder = 'Ask anything...',
  className,
}: ChatInputProps) {
  const [message, setMessage] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSubmit(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className="rounded-xl border border-border bg-card shadow-md">
        {/* Textarea */}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none',
              'min-h-[24px] max-h-[200px]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left actions */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFileUpload}
              disabled={isLoading}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <AtSign className="h-4 w-4" />
              <span className="sr-only">Mention</span>
            </Button>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || isLoading}
            className={cn(
              'h-8 w-8 p-0 rounded-lg transition-all',
              message.trim() && !isLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </form>
  );
}
