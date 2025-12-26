'use client';

import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import type { Message } from '@/types';

interface UserMessageProps {
  message: Message;
  className?: string;
}

export function UserMessage({ message, className }: UserMessageProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
