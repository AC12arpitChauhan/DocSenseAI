'use client';

import * as React from 'react';
import { Search, FileText, Brain } from 'lucide-react';
import { ReasoningStep, StepStatus } from './ReasoningStep';
import { CitationBadge } from './CitationBadge';
import { SourceCard } from './SourceCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolStatus, Citation } from '@/types';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
  toolStatuses?: ToolStatus[];
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

export function AssistantMessage({
  content,
  isStreaming = false,
  toolStatuses = [],
  citations = [],
  onCitationClick,
  className,
}: AssistantMessageProps) {
  const [stepsOpen, setStepsOpen] = React.useState(true);

  // Map tool names to icons
  const getToolIcon = (name: string) => {
    if (name.includes('search') || name.includes('query')) return Search;
    if (name.includes('read') || name.includes('pdf') || name.includes('document')) return FileText;
    return Brain;
  };

  // Map tool status to step status
  const getStepStatus = (tool: ToolStatus): StepStatus => {
    if (tool.error) return 'error';
    if (tool.completed) return 'complete';
    return 'active';
  };

  // Parse content to render citations as badges
  const renderContent = (text: string) => {
    if (!text) return null;
    
    // Replace [n] patterns with CitationBadge components
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
    
    return parts.map((part, index) => {
      // Check for citation patterns like [1] or [1, 2, 3]
      const multiMatch = part.match(/\[([\d,\s]+)\]/);
      if (multiMatch) {
        const numbers = multiMatch[1].split(',').map(n => parseInt(n.trim(), 10));
        return (
          <span key={index}>
            {numbers.map((citationNum, i) => {
              // Citations are 1-indexed in text, array is 0-indexed
              const citation = citations[citationNum - 1];
              console.log(`[UI] Rendering citation [${citationNum}]:`, citation);
              return (
                <CitationBadge
                  key={`${index}-${i}`}
                  number={citationNum}
                  onClick={() => {
                    if (citation) {
                      console.log('[UI] Citation clicked:', citation);
                      onCitationClick?.(citation);
                    } else {
                      console.warn(`[UI] Citation ${citationNum} not found in array of ${citations.length}`);
                    }
                  }}
                  className="mx-0.5"
                />
              );
            })}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };


  return (
    <div className={cn('space-y-4', className)}>
      {/* Reasoning Steps */}
      {toolStatuses.length > 0 && (
        <Collapsible open={stepsOpen} onOpenChange={setStepsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown
              className={cn(
                'w-3 h-3 transition-transform duration-200',
                stepsOpen ? 'rotate-0' : '-rotate-90'
              )}
            />
            <span>
              {toolStatuses.every(t => t.completed) 
                ? `Completed ${toolStatuses.length} step${toolStatuses.length > 1 ? 's' : ''}`
                : 'Reasoning...'}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1 pl-1">
              {toolStatuses.map((tool, index) => (
                <ReasoningStep
                  key={index}
                  icon={getToolIcon(tool.name)}
                  label={formatToolName(tool.name)}
                  status={getStepStatus(tool)}
                  detail={tool.result}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Main content */}
      <div className="message-prose">
        {content ? (
          <div className="whitespace-pre-wrap">
            {renderContent(content)}
            {isStreaming && <span className="streaming-cursor" />}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Brain className="w-4 h-4 animate-pulse" />
            <span>Thinking...</span>
          </div>
        ) : null}
      </div>

      {/* Sources */}
      {citations.length > 0 && !isStreaming && (
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">Sources</p>
          <div className="grid gap-2">
            {/* Deduplicate by document */}
            {Array.from(
              new Map(citations.map(c => [c.document_name, c])).values()
            ).map((citation) => (
              <SourceCard
                key={citation.id}
                filename={citation.document_name}
                page={citation.page_number}
                snippet={citation.text_snippet}
                onClick={() => onCitationClick?.(citation)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to format tool names nicely
function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
