/**
 * Zustand store for chat state management.
 * Handles messages, streaming state, citations, PDF viewer state, and conversation history.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Message,
  Citation,
  UIBlock,
  ToolCall,
  PDFViewerState,
} from '@/types';

// ============================================================
// Conversation Type
// ============================================================

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Chat Store Interface
// ============================================================

interface ChatStore {
  // Messages
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  appendToMessage: (id: string, content: string) => void;
  addCitationToMessage: (id: string, citation: Citation) => void;
  addUIBlockToMessage: (id: string, block: UIBlock) => void;
  addToolCallToMessage: (id: string, toolCall: ToolCall) => void;
  updateToolCallStatus: (
    messageId: string,
    toolName: string,
    status: ToolCall['status'],
    resultSummary?: string
  ) => void;
  clearMessages: () => void;

  // Streaming State
  isStreaming: boolean;
  currentJobId: string | null;
  setStreaming: (isStreaming: boolean, jobId?: string | null) => void;

  // Error State
  error: string | null;
  setError: (error: string | null) => void;

  // Conversation
  conversationId: string;
  conversations: Conversation[];
  newConversation: () => void;
  saveCurrentConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;

  // PDF Viewer
  pdfViewer: PDFViewerState;
  openPdfViewer: (filename: string, pageNumber: number, highlightText?: string) => void;
  closePdfViewer: () => void;
  setPdfPage: (pageNumber: number) => void;
  setPdfZoom: (zoom: number) => void;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// ============================================================
// Helper Functions
// ============================================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const generateTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    return content.length > 50 ? content.slice(0, 50) + '...' : content;
  }
  return 'New Chat';
};

// ============================================================
// Store Creation
// ============================================================

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // ========== Messages ==========
      messages: [],

      addMessage: (message) => {
        const id = generateId();
        const newMessage: Message = {
          ...message,
          id,
          timestamp: new Date(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
        return id;
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }));
      },

      appendToMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content: msg.content + content } : msg
          ),
        }));
      },

      addCitationToMessage: (id, citation) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id
              ? { ...msg, citations: [...msg.citations, citation] }
              : msg
          ),
        }));
      },

      addUIBlockToMessage: (id, block) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id
              ? { ...msg, uiBlocks: [...msg.uiBlocks, block] }
              : msg
          ),
        }));
      },

      addToolCallToMessage: (id, toolCall) => {
        set((state) => ({
          messages: state.messages.map((msg) => {
            if (msg.id !== id) return msg;
            
            // Check if tool call already exists (dedup by tool_name)
            const exists = msg.toolCalls.some(
              (tc) => tc.tool_name === toolCall.tool_name
            );
            
            if (exists) {
              return msg; // Don't add duplicate
            }
            
            return { ...msg, toolCalls: [...msg.toolCalls, toolCall] };
          }),
        }));
      },

      updateToolCallStatus: (messageId, toolName, status, resultSummary) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  toolCalls: msg.toolCalls.map((tc) =>
                    tc.tool_name === toolName
                      ? { ...tc, status, result_summary: resultSummary }
                      : tc
                  ),
                }
              : msg
          ),
        }));
      },

      clearMessages: () => {
        set({ messages: [], error: null });
      },

      // ========== Streaming State ==========
      isStreaming: false,
      currentJobId: null,

      setStreaming: (isStreaming, jobId = null) => {
        set({ isStreaming, currentJobId: jobId });
      },

      // ========== Error State ==========
      error: null,

      setError: (error) => {
        set({ error });
      },

      // ========== Conversation History ==========
      conversationId: generateId(),
      conversations: [],

      saveCurrentConversation: () => {
        const { messages, conversationId, conversations } = get();
        
        // Only save if there are messages
        if (messages.length === 0) return;

        const now = new Date().toISOString();
        const existingIndex = conversations.findIndex(c => c.id === conversationId);

        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...conversations];
          updated[existingIndex] = {
            ...updated[existingIndex],
            messages,
            title: generateTitle(messages),
            updatedAt: now,
          };
          set({ conversations: updated });
        } else {
          // Create new conversation
          const newConversation: Conversation = {
            id: conversationId,
            title: generateTitle(messages),
            messages,
            createdAt: now,
            updatedAt: now,
          };
          set({ conversations: [newConversation, ...conversations].slice(0, 50) }); // Keep last 50
        }
      },

      newConversation: () => {
        const { saveCurrentConversation } = get();
        
        // Save current conversation first
        saveCurrentConversation();
        
        // Start fresh
        set({
          messages: [],
          error: null,
          conversationId: generateId(),
        });
      },

      loadConversation: (id) => {
        const { conversations, saveCurrentConversation } = get();
        const conversation = conversations.find(c => c.id === id);
        
        if (conversation) {
          // Save current first
          saveCurrentConversation();
          
          // Load the selected conversation
          set({
            messages: conversation.messages,
            conversationId: conversation.id,
            error: null,
          });
        }
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter(c => c.id !== id),
        }));
      },

      // ========== PDF Viewer ==========
      pdfViewer: {
        isOpen: false,
        filename: null,
        pageNumber: 1,
        highlightText: null,
        zoom: 1,
      },

      openPdfViewer: (filename, pageNumber, highlightText) => {
        set({
          pdfViewer: {
            isOpen: true,
            filename,
            pageNumber,
            highlightText: highlightText ?? null,
            zoom: 1,
          },
        });
      },

      closePdfViewer: () => {
        set((state) => ({
          pdfViewer: {
            ...state.pdfViewer,
            isOpen: false,
          },
        }));
      },

      setPdfPage: (pageNumber) => {
        set((state) => ({
          pdfViewer: {
            ...state.pdfViewer,
            pageNumber,
          },
        }));
      },

      setPdfZoom: (zoom) => {
        set((state) => ({
          pdfViewer: {
            ...state.pdfViewer,
            zoom,
          },
        }));
      },

      // ========== Theme ==========
      isDarkMode: true,

      toggleDarkMode: () => {
        set((state) => ({ isDarkMode: !state.isDarkMode }));
      },
    }),
    {
      name: 'docsense-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        conversationId: state.conversationId,
        conversations: state.conversations,
        messages: state.messages, // Persist current chat too
      }),
    }
  )
);
