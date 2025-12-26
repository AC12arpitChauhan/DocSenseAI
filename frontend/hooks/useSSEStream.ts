/**
 * Custom hook for SSE streaming with React Query integration.
 * Manages the streaming lifecycle and updates Zustand store.
 */
'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useChatStore } from '@/stores/chatStore';
import { createSSEConnection, sendChatMessage } from '@/lib/sse';
import type { StreamEvent, ToolCall } from '@/types';

export function useSSEStream() {
  const store = useChatStore();
  const cleanupRef = useRef<(() => void) | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // Handle incoming SSE events
  const handleEvent = useCallback((event: StreamEvent) => {
    const messageId = currentMessageIdRef.current;
    if (!messageId) return;

    switch (event.event) {
      case 'text_chunk':
        store.appendToMessage(messageId, event.content);
        break;

      case 'tool_call_start':
        const newToolCall: ToolCall = {
          tool_type: event.tool_type,
          tool_name: event.tool_name,
          description: event.description,
          status: 'running',
        };
        store.addToolCallToMessage(messageId, newToolCall);
        break;

      case 'tool_call_end':
        store.updateToolCallStatus(
          messageId,
          event.tool_name,
          event.success ? 'completed' : 'failed',
          event.result_summary
        );
        break;

      case 'citation':
        store.addCitationToMessage(messageId, event.citation);
        break;

      case 'ui_block':
        store.addUIBlockToMessage(messageId, event.block);
        break;

      case 'error':
        store.setError(event.message);
        if (!event.recoverable) {
          store.setStreaming(false);
          store.updateMessage(messageId, { isStreaming: false });
        }
        break;

      case 'done':
        store.setStreaming(false);
        store.updateMessage(messageId, { isStreaming: false });
        break;
    }
  }, [store]);

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // Add user message
      store.addMessage({
        role: 'user',
        content: message,
        citations: [],
        uiBlocks: [],
        toolCalls: [],
        isStreaming: false,
      });

      // Add placeholder assistant message
      const assistantMessageId = store.addMessage({
        role: 'assistant',
        content: '',
        citations: [],
        uiBlocks: [],
        toolCalls: [],
        isStreaming: true,
      });
      currentMessageIdRef.current = assistantMessageId;

      // Send to backend
      const response = await sendChatMessage(message, store.conversationId);
      store.setStreaming(true, response.job_id);

      // Start SSE stream
      cleanupRef.current = createSSEConnection(response.job_id, {
        onEvent: handleEvent,
        onError: (error) => {
          store.setError(error.message);
          store.setStreaming(false);
          store.updateMessage(assistantMessageId, { isStreaming: false });
        },
        onClose: () => {
          store.setStreaming(false);
          if (currentMessageIdRef.current) {
            store.updateMessage(currentMessageIdRef.current, { isStreaming: false });
          }
        },
      });

      return response;
    },
  });

  // Stop streaming
  const stopStreaming = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    store.setStreaming(false);
    if (currentMessageIdRef.current) {
      store.updateMessage(currentMessageIdRef.current, { isStreaming: false });
    }
  }, [store]);

  return {
    sendMessage: sendMessageMutation.mutate,
    isPending: sendMessageMutation.isPending,
    isStreaming: store.isStreaming,
    error: store.error,
    stopStreaming,
  };
}
