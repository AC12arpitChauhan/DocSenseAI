'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ChatTimeline } from '@/components/chat/ChatTimeline';
import { PDFViewerPanel } from '@/components/pdf/PDFViewerPanel';
import { PDFUploadPanel } from '@/components/pdf/PDFUploadPanel';
import { useChatStore } from '@/stores/chatStore';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Animation variants for PDF viewer entrance/exit
const pdfViewerVariants = {
  hidden: {
    x: '100%',
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      duration: 0.35,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    scale: 0.95,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
      duration: 0.3,
    },
  },
};

// Chat section animation variants
const chatVariants = {
  full: {
    width: '100%',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  split: {
    width: '60%',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

export default function HomePage() {
  const pdfViewer = useChatStore((state) => state.pdfViewer);
  const closePdfViewer = useChatStore((state) => state.closePdfViewer);
  const messages = useChatStore((state) => state.messages);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const hasMessages = messages.length > 0;

  return (
    <AppSidebar onUploadClick={() => setUploadOpen(true)}>
      <div className="flex h-full overflow-hidden">
        {/* Chat Section - Animated width change */}
        <motion.div
          className="flex-1 min-w-0 flex flex-col h-full"
          variants={chatVariants}
          animate={pdfViewer.isOpen && !isMobile ? 'split' : 'full'}
          initial={false}
        >
          <ChatTimeline 
            onFileUpload={() => setUploadOpen(true)} 
            showHero={!hasMessages}
            className="h-full"
          />
        </motion.div>

        {/* PDF Viewer Panel - Desktop with Framer Motion */}
        <AnimatePresence mode="wait">
          {pdfViewer.isOpen && !isMobile && (
            <motion.div
              key="pdf-viewer"
              className="w-2/5 border-l border-border bg-card overflow-hidden"
              variants={pdfViewerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <PDFViewerPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF Viewer - Mobile Only (Sheet) */}
        {isMobile && (
          <Sheet 
            open={pdfViewer.isOpen} 
            onOpenChange={(open) => !open && closePdfViewer()}
          >
            <SheetContent side="bottom" className="h-[80vh] p-0">
              <SheetTitle className="sr-only">PDF Viewer</SheetTitle>
              <SheetDescription className="sr-only">View and navigate PDF documents</SheetDescription>
              <PDFViewerPanel />
            </SheetContent>
          </Sheet>
        )}

        {/* Upload Panel */}
        <PDFUploadPanel 
          isOpen={uploadOpen} 
          onClose={() => setUploadOpen(false)} 
        />
      </div>
    </AppSidebar>
  );
}
