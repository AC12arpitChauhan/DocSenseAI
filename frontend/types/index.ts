/**
 * Type definitions for the AI Search Chat application.
 */

// ============================================================
// Event Types
// ============================================================

export type EventType =
  | 'text_chunk'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'citation'
  | 'ui_block'
  | 'error'
  | 'done';

export type UIBlockType = 'info_card' | 'table' | 'chart';

export type ToolType = 'search_documents' | 'read_pdf' | 'analyze_content';

// ============================================================
// Citation Types
// ============================================================

export interface Citation {
  id: number;
  document_name: string;
  page_number: number;
  text_snippet: string;
  start_char?: number;
  end_char?: number;
}

// ============================================================
// UI Block Types
// ============================================================

export interface InfoCardData {
  title: string;
  content: string;
  icon?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ChartData {
  chart_type: 'bar' | 'line' | 'pie';
  labels: string[];
  values: number[];
  title?: string;
}

export interface UIBlock {
  type: UIBlockType;
  data: InfoCardData | TableData | ChartData;
}

// ============================================================
// Stream Event Types
// ============================================================

export interface TextChunkEvent {
  event: 'text_chunk';
  content: string;
}

export interface ToolCallStartEvent {
  event: 'tool_call_start';
  tool_type: ToolType;
  tool_name: string;
  description: string;
}

export interface ToolCallEndEvent {
  event: 'tool_call_end';
  tool_type: ToolType;
  tool_name: string;
  success: boolean;
  result_summary?: string;
}

export interface CitationEvent {
  event: 'citation';
  citation: Citation;
}

export interface UIBlockEvent {
  event: 'ui_block';
  block: UIBlock;
}

export interface ErrorEvent {
  event: 'error';
  message: string;
  recoverable: boolean;
}

export interface DoneEvent {
  event: 'done';
  total_tokens?: number;
}

export type StreamEvent =
  | TextChunkEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | CitationEvent
  | UIBlockEvent
  | ErrorEvent
  | DoneEvent;

// ============================================================
// Message Types
// ============================================================

export interface ToolCall {
  tool_type: ToolType;
  tool_name: string;
  description: string;
  status: 'running' | 'completed' | 'failed';
  result_summary?: string;
}

// Used by UI components for rendering status
export interface ToolStatus {
  name: string;
  completed: boolean;
  result?: string;
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  uiBlocks: UIBlock[];
  toolCalls: ToolCall[];
  isStreaming: boolean;
  timestamp: Date;
}

// ============================================================
// Chat State Types
// ============================================================

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentJobId: string | null;
  error: string | null;
  conversationId: string;
}

// ============================================================
// PDF Viewer Types
// ============================================================

export interface PDFViewerState {
  isOpen: boolean;
  filename: string | null;
  pageNumber: number;
  highlightText: string | null;
  zoom: number;
}

export interface PDFMetadata {
  filename: string;
  title?: string;
  page_count: number;
  size_bytes: number;
}

// ============================================================
// API Response Types
// ============================================================

export interface ChatResponse {
  job_id: string;
  status: string;
}

export interface JobStatus {
  job_id: string;
  status: 'queued' | 'started' | 'finished' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}
