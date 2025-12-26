'use client';

import { cn } from '@/lib/utils';
import { Check, Loader2, type LucideIcon } from 'lucide-react';

export type StepStatus = 'pending' | 'active' | 'complete' | 'error';

interface ReasoningStepProps {
  icon: LucideIcon;
  label: string;
  status: StepStatus;
  detail?: string;
  className?: string;
}

export function ReasoningStep({
  icon: Icon,
  label,
  status,
  detail,
  className,
}: ReasoningStepProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-lg text-sm transition-colors duration-200',
        status === 'pending' && 'text-muted-foreground',
        status === 'active' && 'text-foreground bg-muted/50',
        status === 'complete' && 'text-muted-foreground',
        status === 'error' && 'text-destructive',
        className
      )}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {status === 'active' ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : status === 'complete' ? (
          <Check className="w-4 h-4 text-muted-foreground" />
        ) : status === 'error' ? (
          <div className="w-2 h-2 rounded-full bg-destructive" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      {/* Icon */}
      <Icon className="w-4 h-4 flex-shrink-0" />

      {/* Label and detail */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate">{label}</span>
        {detail && (
          <span className="text-xs text-muted-foreground truncate">
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
