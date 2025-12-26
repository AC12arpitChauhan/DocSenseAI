'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Search, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { getPDFUrl } from '@/lib/sse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PDFViewerPanelProps {
  className?: string;
}

interface SearchMatch {
  index: number;
  text: string;
}

export function PDFViewerPanel({ className }: PDFViewerPanelProps) {
  const { pdfViewer, closePdfViewer } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const pdfUrl = pdfViewer.filename ? getPDFUrl(pdfViewer.filename) : null;

  // Reset loading state when PDF changes
  useEffect(() => {
    if (pdfViewer.filename) {
      setIsLoading(true);
      setError(null);
      setSearchQuery('');
      setSearchMatches([]);
    }
  }, [pdfViewer.filename]);

  // Extract a cleaner filename for display
  const displayName = pdfViewer.filename 
    ? pdfViewer.filename.replace(/_[a-f0-9]+\.pdf$/i, '.pdf').replace(/_/g, ' ')
    : 'Document';

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !pdfViewer.filename) return;
    
    setIsSearching(true);
    setSearchMatches([]);
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/pdfs/${encodeURIComponent(pdfViewer.filename)}/search?query=${encodeURIComponent(searchQuery)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Map backend response to our format
        const matches: SearchMatch[] = (data.results || []).map((r: { context: string }, i: number) => ({
          index: i,
          text: r.context,
        }));
        setSearchMatches(matches);
        setCurrentMatchIndex(0);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, pdfViewer.filename]);

  // Navigate between matches
  const goToNextMatch = () => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
    }
  };

  const goToPrevMatch = () => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
    }
  };

  // Handle Enter key for search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <motion.div 
      className={cn('h-full flex flex-col bg-background', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header - Clean, minimal */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div 
            className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <FileText className="w-4 h-4 text-primary" />
          </motion.div>
          <motion.div 
            className="min-w-0"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-sm font-medium text-foreground truncate">
              {displayName}
            </p>
            {pdfViewer.pageNumber && (
              <p className="text-xs text-muted-foreground">
                Page {pdfViewer.pageNumber}
              </p>
            )}
          </motion.div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(!searchOpen)}
            className={cn("h-8 w-8 p-0 hover:bg-muted", searchOpen && "bg-muted")}
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={closePdfViewer}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>

      {/* Search Bar - Animated */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="px-4 py-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : searchMatches.length > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {currentMatchIndex + 1}/{searchMatches.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrevMatch}
                    className="h-6 w-6 p-0"
                    disabled={searchMatches.length <= 1}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextMatch}
                    className="h-6 w-6 p-0"
                    disabled={searchMatches.length <= 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              ) : searchQuery && !isSearching ? (
                <span className="text-xs text-muted-foreground">No results</span>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Citation Highlight - Show the relevant text snippet */}
      <AnimatePresence>
        {pdfViewer.highlightText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 bg-primary/5 border-b border-primary/10 overflow-hidden"
          >
            <p className="text-xs font-medium text-primary/70 mb-1">Relevant excerpt</p>
            <p className="text-sm text-foreground leading-relaxed">
              "{pdfViewer.highlightText}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results Highlight */}
      <AnimatePresence>
        {searchMatches.length > 0 && searchMatches[currentMatchIndex] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 overflow-hidden"
          >
            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
              Search result {currentMatchIndex + 1}
            </p>
            <p className="text-sm text-foreground">
              "...{searchMatches[currentMatchIndex].text}..."
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Content - Full width, simple */}
      <div className="flex-1 overflow-auto bg-muted/10">
        {isLoading && (
          <motion.div 
            className="flex items-center justify-center h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {pdfUrl && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full h-full"
          >
            <iframe
              src={`${pdfUrl}#page=${pdfViewer.pageNumber}&search=${encodeURIComponent(searchQuery)}`}
              className="w-full h-full bg-white"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError('Failed to load PDF');
              }}
              title={displayName}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
