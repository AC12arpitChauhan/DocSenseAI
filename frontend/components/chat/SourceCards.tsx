/**
 * Source cards component for displaying citation references.
 */
'use client';

import { motion } from 'framer-motion';
import type { Citation } from '@/types';
import { useChatStore } from '@/stores/chatStore';

interface SourceCardsProps {
  citations: Citation[];
}

export function SourceCards({ citations }: SourceCardsProps) {
  const openPdfViewer = useChatStore((state) => state.openPdfViewer);

  // Remove duplicates based on document + page
  const uniqueCitations = citations.filter(
    (citation, index, self) =>
      index ===
      self.findIndex(
        (c) =>
          c.document_name === citation.document_name &&
          c.page_number === citation.page_number
      )
  );

  if (uniqueCitations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2"
    >
      <h4 className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wide mb-2">
        Sources
      </h4>
      <div className="flex flex-wrap gap-2">
        {uniqueCitations.map((citation) => (
          <motion.button
            key={`${citation.document_name}-${citation.page_number}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              openPdfViewer(
                citation.document_name,
                citation.page_number,
                citation.text_snippet
              )
            }
            className="source-card group"
          >
            {/* Citation number badge */}
            <div className="citation-badge flex-shrink-0">
              {citation.id}
            </div>

            {/* Citation details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-red-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-dark-800 dark:text-dark-200 truncate">
                  {citation.document_name}
                </span>
              </div>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                Page {citation.page_number}
              </p>
              <p className="text-xs text-dark-400 dark:text-dark-500 mt-1 line-clamp-2">
                {citation.text_snippet}
              </p>
            </div>

            {/* Arrow icon */}
            <svg
              className="w-4 h-4 text-dark-400 group-hover:text-primary-500 transition-colors flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
