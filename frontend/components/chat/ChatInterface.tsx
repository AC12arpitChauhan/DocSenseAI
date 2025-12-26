/**
 * Main chat interface component.
 * Handles message display, input, and streaming.
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';
import { useSSEStream } from '@/hooks/useSSEStream';
import { MessageList } from './MessageList';
import { WelcomeScreen } from './WelcomeScreen';

export function ChatInterface() {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const messages = useChatStore((state) => state.messages);
  const error = useChatStore((state) => state.error);
  const { sendMessage, isPending, isStreaming, stopStreaming } = useSSEStream();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message || isPending || isStreaming) return;

    sendMessage(message);
    setInputValue('');
    inputRef.current?.focus();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <AnimatePresence mode="wait">
          {hasMessages ? (
            <MessageList messages={messages} key="messages" />
          ) : (
            <WelcomeScreen key="welcome" />
          )}
        </AnimatePresence>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-4 mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your documents..."
                rows={1}
                disabled={isPending || isStreaming}
                className="chat-input resize-none pr-12"
              />
              
              {/* Character count */}
              {inputValue.length > 0 && (
                <span className="absolute right-3 bottom-3 text-xs text-dark-400">
                  {inputValue.length}/4000
                </span>
              )}
            </div>

            {/* Submit or Stop Button */}
            {isStreaming ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={stopStreaming}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500 hover:bg-red-600 
                         text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!inputValue.trim() || isPending}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 
                         hover:from-primary-600 hover:to-primary-700
                         text-white flex items-center justify-center
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all shadow-lg shadow-primary-500/25"
              >
                {isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </motion.button>
            )}
          </div>

          {/* Hints */}
          <p className="mt-2 text-xs text-center text-dark-400 dark:text-dark-500">
            Press Enter to send, Shift + Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
