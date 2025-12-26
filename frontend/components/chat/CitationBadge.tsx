'use client';

import { cn } from '@/lib/utils';

interface CitationBadgeProps {
  number: number;
  onClick?: () => void;
  className?: string;
}

export function CitationBadge({ number, onClick, className }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[1.25rem] h-5 px-1.5',
        'text-xs font-medium',
        'bg-muted text-muted-foreground',
        'rounded',
        'hover:bg-primary/20 hover:text-primary',
        'transition-colors duration-150',
        'cursor-pointer',
        className
      )}
    >
      {number}
    </button>
  );
}
