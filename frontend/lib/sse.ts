/**
 * SSE (Server-Sent Events) client utilities.
 * Handles connection, parsing, and reconnection logic.
 */

import type { StreamEvent, EventType } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SSEConfig {
  onEvent: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Create an SSE connection to stream chat responses.
 * 
 * @param jobId - The job ID to stream
 * @param config - SSE configuration with event handlers
 * @returns Cleanup function to close the connection
 */
export function createSSEConnection(
  jobId: string,
  config: SSEConfig
): () => void {
  const {
    onEvent,
    onError,
    onClose,
    reconnectAttempts = 3,
    reconnectDelay = 1000,
  } = config;

  let eventSource: EventSource | null = null;
  let attemptCount = 0;
  let isClosedManually = false;
  let receivedDone = false;

  const connect = () => {
    if (isClosedManually || receivedDone) return;

    const url = `${API_BASE_URL}/api/chat/${jobId}/stream`;
    console.log(`[SSE] Connecting to ${url}`);
    eventSource = new EventSource(url);

    // Handle different event types
    const eventTypes: EventType[] = [
      'text_chunk',
      'tool_call_start',
      'tool_call_end',
      'citation',
      'ui_block',
      'error',
      'done',
    ];

    eventTypes.forEach((eventType) => {
      eventSource?.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as StreamEvent;
          console.log(`[SSE] Event: ${eventType}`, data);
          onEvent(data);

          // Close connection on done event
          if (eventType === 'done') {
            console.log('[SSE] Received done, closing connection');
            receivedDone = true;
            eventSource?.close();
            onClose?.();
          }
        } catch (err) {
          console.error('[SSE] Failed to parse event:', err);
        }
      });
    });

    // Handle generic message events
    eventSource.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as StreamEvent;
        console.log('[SSE] Generic message:', data);
        onEvent(data);
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    };

    // Handle connection open
    eventSource.onopen = () => {
      console.log('[SSE] Connection opened');
      attemptCount = 0;
    };

    // Handle errors and potentially reconnect
    eventSource.onerror = (e) => {
      console.error('[SSE] Connection error', e);
      eventSource?.close();

      if (isClosedManually || receivedDone) return;

      if (attemptCount < reconnectAttempts) {
        attemptCount++;
        console.log(`[SSE] Reconnecting (attempt ${attemptCount}/${reconnectAttempts})`);
        setTimeout(connect, reconnectDelay * attemptCount);
      } else {
        console.error('[SSE] Max retries reached');
        onError?.(new Error('SSE connection failed after maximum retries'));
        onClose?.();
      }
    };
  };

  connect();

  // Return cleanup function
  return () => {
    console.log('[SSE] Manual close requested');
    isClosedManually = true;
    eventSource?.close();
  };
}

/**
 * Send a chat message and get the job ID.
 * 
 * @param message - The user's message
 * @param conversationId - Optional conversation ID for context
 * @returns The job ID for streaming
 */
export async function sendChatMessage(
  message: string,
  conversationId?: string
): Promise<{ job_id: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the status of a chat job.
 */
export async function getJobStatus(jobId: string) {
  const response = await fetch(`${API_BASE_URL}/api/chat/${jobId}/status`);

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List available PDF documents.
 */
export async function listPDFs() {
  const response = await fetch(`${API_BASE_URL}/api/pdfs`);

  if (!response.ok) {
    throw new Error(`Failed to list PDFs: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the URL for a PDF document.
 */
export function getPDFUrl(filename: string): string {
  return `${API_BASE_URL}/api/pdfs/${encodeURIComponent(filename)}`;
}

/**
 * Upload a PDF document.
 */
export async function uploadPDF(file: File): Promise<{
  status: string;
  message: string;
  filename: string;
  page_count: number;
  size_bytes: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/pdfs/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Failed to upload PDF');
  }

  return response.json();
}

/**
 * Delete a PDF document.
 */
export async function deletePDF(filename: string): Promise<{
  status: string;
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/pdfs/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Failed to delete PDF');
  }

  return response.json();
}
