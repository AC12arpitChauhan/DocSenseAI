'use client';

import * as React from 'react';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ChatInput } from './ChatInput';
import { TypewriterEffectSmooth } from '@/components/ui/typewriter-effect';
import { useChatStore } from '@/stores/chatStore';
import { sendChatMessage, createSSEConnection } from '@/lib/sse';
import { cn } from '@/lib/utils';
import type { Citation, ToolStatus, ToolType, StreamEvent } from '@/types';

interface ChatTimelineProps {
  onFileUpload?: () => void;
  showHero?: boolean;
  className?: string;
}

export function ChatTimeline({ onFileUpload, showHero = false, className }: ChatTimelineProps) {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const conversationId = useChatStore((state) => state.conversationId);
  const addMessage = useChatStore((state) => state.addMessage);
  const appendToMessage = useChatStore((state) => state.appendToMessage);
  const addCitationToMessage = useChatStore((state) => state.addCitationToMessage);
  const addToolCallToMessage = useChatStore((state) => state.addToolCallToMessage);
  const updateToolCallStatus = useChatStore((state) => state.updateToolCallStatus);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setStreaming = useChatStore((state) => state.setStreaming);
  const setError = useChatStore((state) => state.setError);
  const openPdfViewer = useChatStore((state) => state.openPdfViewer);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleCitationClick = (citation: Citation) => {
    console.log('[UI] Citation clicked:', citation);
    openPdfViewer(citation.document_name, citation.page_number, citation.text_snippet);
  };

  const handleSubmit = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    // Add user message
    addMessage({
      role: 'user',
      content,
      citations: [],
      uiBlocks: [],
      toolCalls: [],
      isStreaming: false,
    });

    // Add assistant message placeholder
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: '',
      citations: [],
      uiBlocks: [],
      toolCalls: [],
      isStreaming: true,
    });
    
    setStreaming(true);

    try {
      // Send message to get job ID
      const { job_id } = await sendChatMessage(content, conversationId);
      console.log('[UI] Job started:', job_id);

      // Create SSE connection to stream response
      createSSEConnection(job_id, {
        onEvent: (event: StreamEvent) => {
          console.log('[UI] Event received:', event.event);
          switch (event.event) {
            case 'text_chunk':
              appendToMessage(assistantMessageId, event.content);
              break;
            case 'tool_call_start':
              addToolCallToMessage(assistantMessageId, {
                tool_type: event.tool_type as ToolType,
                tool_name: event.tool_name,
                description: event.description,
                status: 'running',
              });
              break;
            case 'tool_call_end':
              updateToolCallStatus(
                assistantMessageId,
                event.tool_name,
                event.success ? 'completed' : 'failed',
                event.result_summary
              );
              break;
            case 'citation':
              console.log('[UI] Adding citation:', event.citation);
              addCitationToMessage(assistantMessageId, event.citation);
              break;
            case 'error':
              setError(event.message);
              break;
            case 'done':
              updateMessage(assistantMessageId, { isStreaming: false });
              setStreaming(false);
              break;
          }
        },
        onError: (error: Error) => {
          console.error('[UI] SSE Error:', error);
          setError(error.message);
          setStreaming(false);
        },
        onClose: () => {
          setStreaming(false);
        },
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setStreaming(false);
    }
  };

  // Convert toolCalls to toolStatuses for rendering
  const getToolStatuses = (message: typeof messages[0]): ToolStatus[] => {
    return message.toolCalls.map((tc) => ({
      name: tc.tool_name,
      completed: tc.status === 'completed',
      result: tc.result_summary,
      error: tc.status === 'failed' ? 'Failed' : undefined,
    }));
  };

  // Typewriter words for hero
  const typewriterWords = [
    { text: 'Ask' },
    { text: 'questions.' },
    { text: 'Get' },
    { text: 'cited', className: 'text-primary' },
    { text: 'answers.' },
  ];

  const hasMessages = messages.length > 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Scrollable messages area */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 pb-8">
          {/* Hero section with typewriter */}
          {showHero && !hasMessages && !isStreaming && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <p className="text-muted-foreground text-sm mb-4">
                Research-first answers from your documents
              </p>
              <TypewriterEffectSmooth 
                words={typewriterWords} 
                cursorClassName="bg-primary"
              />
            </div>
          )}

          {messages.map((message, index) => (
            <div key={message.id || index}>
              {message.role === 'user' ? (
                <UserMessage message={message} />
              ) : (
                <AssistantMessage
                  content={message.content}
                  isStreaming={message.isStreaming}
                  toolStatuses={getToolStatuses(message)}
                  citations={message.citations}
                  onCitationClick={handleCitationClick}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Input area at bottom - solid background, no gradient */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSubmit={handleSubmit}
            onFileUpload={onFileUpload}
            isLoading={isStreaming}
            placeholder="Ask anything about your documents..."
          />
        </div>
      </div>
    </div>
  );
}
