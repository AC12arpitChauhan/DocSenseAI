/**
 * Welcome screen shown when no messages exist.
 */
'use client';

import { motion } from 'framer-motion';

const suggestions = [
  'What are the key points in my documents?',
  'Summarize the main findings',
  'Find information about specific topics',
  'Compare different sections',
];

export function WelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center px-4 py-12"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-6 shadow-2xl shadow-primary-500/30"
      >
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </motion.div>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold text-dark-900 dark:text-dark-50 mb-3 text-center">
        What would you like to know?
      </h2>

      {/* Subtitle */}
      <p className="text-dark-500 dark:text-dark-400 text-center max-w-md mb-8">
        Ask questions about your documents. I&apos;ll search through them and provide answers with citations.
      </p>

      {/* Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="text-left p-4 rounded-xl 
                     border border-dark-200 dark:border-dark-700
                     bg-white dark:bg-dark-800/50
                     hover:border-primary-500 dark:hover:border-primary-500
                     hover:bg-primary-50 dark:hover:bg-primary-500/10
                     transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">💡</span>
              <span className="text-sm text-dark-700 dark:text-dark-300">
                {suggestion}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Features */}
      <div className="flex flex-wrap justify-center gap-6 mt-12">
        {[
          { icon: '🔍', label: 'Deep Search' },
          { icon: '📄', label: 'PDF Citations' },
          { icon: '⚡', label: 'Real-time Streaming' },
          { icon: '🎨', label: 'Rich UI' },
        ].map((feature) => (
          <div
            key={feature.label}
            className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400"
          >
            <span>{feature.icon}</span>
            <span>{feature.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
