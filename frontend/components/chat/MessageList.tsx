/**
 * Message list component for rendering chat messages.
 */
'use client';

import { motion } from 'framer-motion';
import type { Message } from '@/types';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="chat-container space-y-6 pb-6"
    >
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.3) }}
        >
          {message.role === 'user' ? (
            <UserMessage message={message} />
          ) : (
            <AIMessage message={message} />
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
