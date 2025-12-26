/**
 * AI message component with streaming, citations, tool calls, and UI blocks.
 */
'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/types';
import { useChatStore } from '@/stores/chatStore';
import { ToolIndicator } from './ToolIndicator';
import { SourceCards } from './SourceCards';
import { UIBlockRenderer } from '../ui/UIBlockRenderer';

interface AIMessageProps {
  message: Message;
}

export function AIMessage({ message }: AIMessageProps) {
  const openPdfViewer = useChatStore((state) => state.openPdfViewer);

  // Parse content to render citations as clickable badges
  const renderedContent = useMemo(() => {
    if (!message.content) return null;

    const citationPattern = /\[(\d+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationPattern.exec(message.content)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {message.content.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Add citation badge
      const citationNum = parseInt(match[1], 10);
      const citation = message.citations.find((c) => c.id === citationNum);

      parts.push(
        <button
          key={`citation-${match.index}`}
          onClick={() => {
            if (citation) {
              openPdfViewer(
                citation.document_name,
                citation.page_number,
                citation.text_snippet
              );
            }
          }}
          className="citation-badge mx-0.5 hover:scale-110 transition-transform"
          title={citation ? `${citation.document_name}, Page ${citation.page_number}` : undefined}
        >
          {citationNum}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {message.content.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  }, [message.content, message.citations, openPdfViewer]);

  return (
    <div className="flex flex-col gap-4">
      {/* Tool Call Indicators */}
      <AnimatePresence>
        {message.toolCalls.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {message.toolCalls.map((toolCall, index) => (
              <ToolIndicator key={`${toolCall.tool_name}-${index}`} toolCall={toolCall} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Content */}
      <div className="flex">
        <div className="message-bubble message-assistant">
          {/* Loading indicator when no content yet */}
          {message.isStreaming && !message.content && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-dark-500">Thinking...</span>
            </div>
          )}

          {/* Message text with citations */}
          {message.content && (
            <p className={`whitespace-pre-wrap ${message.isStreaming ? 'streaming-cursor' : ''}`}>
              {renderedContent}
            </p>
          )}

          {/* UI Blocks */}
          {message.uiBlocks.length > 0 && (
            <div className="mt-4 space-y-4">
              {message.uiBlocks.map((block, index) => (
                <UIBlockRenderer key={index} block={block} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Source Cards */}
      {message.citations.length > 0 && !message.isStreaming && (
        <SourceCards citations={message.citations} />
      )}
    </div>
  );
}
