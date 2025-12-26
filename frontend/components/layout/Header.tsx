/**
 * Header component with branding and controls.
 */
'use client';

import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { motion } from 'framer-motion';
import { PDFUploadPanel } from '@/components/pdf/PDFUploadPanel';

export function Header() {
  const { isDarkMode, toggleDarkMode, newConversation, messages } = useChatStore();
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);

  return (
    <>
      <header className="border-b border-dark-200 dark:border-dark-800 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                AI Search Chat
              </h1>
              <p className="text-xs text-dark-500 dark:text-dark-400">
                Powered by LangGraph
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Upload Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsUploadPanelOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
                       bg-primary-100 dark:bg-primary-900/30 
                       hover:bg-primary-200 dark:hover:bg-primary-900/50
                       text-primary-700 dark:text-primary-300
                       transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload PDF
            </motion.button>

            {/* New Chat Button */}
            {messages.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={newConversation}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
                         bg-dark-100 dark:bg-dark-800 
                         hover:bg-dark-200 dark:hover:bg-dark-700
                         text-dark-700 dark:text-dark-200
                         transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </motion.button>
            )}

            {/* Dark Mode Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleDarkMode}
              className="btn-icon"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Upload Panel */}
      <PDFUploadPanel
        isOpen={isUploadPanelOpen}
        onClose={() => setIsUploadPanelOpen(false)}
      />
    </>
  );
}

