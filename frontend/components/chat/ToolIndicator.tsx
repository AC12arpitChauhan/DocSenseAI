/**
 * Tool indicator component showing active tool calls.
 */
'use client';

import { motion } from 'framer-motion';
import type { ToolCall } from '@/types';

interface ToolIndicatorProps {
  toolCall: ToolCall;
}

const toolIcons: Record<string, string> = {
  search_documents: '🔍',
  read_pdf: '📄',
  analyze_content: '🧠',
  list_available_documents: '📚',
  get_document_summary: '📋',
};

export function ToolIndicator({ toolCall }: ToolIndicatorProps) {
  const icon = toolIcons[toolCall.tool_name] || '⚙️';
  const isRunning = toolCall.status === 'running';
  const isCompleted = toolCall.status === 'completed';
  const isFailed = toolCall.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`tool-indicator ${isRunning ? 'pulse-glow' : ''}`}
    >
      <span className={isRunning ? 'animate-pulse' : ''}>{icon}</span>
      <span className="max-w-[200px] truncate">{toolCall.description}</span>
      
      {/* Status indicator */}
      {isCompleted && (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-4 h-4 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </motion.svg>
      )}
      
      {isFailed && (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-4 h-4 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </motion.svg>
      )}
    </motion.div>
  );
}
