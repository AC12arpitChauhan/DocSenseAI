'use client';

import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceCardProps {
  filename: string;
  page?: number;
  snippet?: string;
  onClick?: () => void;
  className?: string;
}

export function SourceCard({
  filename,
  page,
  snippet,
  onClick,
  className,
}: SourceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3',
        'rounded-lg border border-border/50',
        'bg-card hover:bg-accent/50',
        'text-left',
        'transition-colors duration-150',
        className
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
        <FileText className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {filename}
        </p>
        {page && (
          <p className="text-xs text-muted-foreground">
            Page {page}
          </p>
        )}
        {snippet && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {snippet}
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}
