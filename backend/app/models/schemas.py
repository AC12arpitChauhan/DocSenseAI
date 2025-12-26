"""
Pydantic models for the AI Search Chat application.
Defines all request/response schemas and data structures.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Types of Server-Sent Events the backend can emit."""
    TEXT_CHUNK = "text_chunk"
    TOOL_CALL_START = "tool_call_start"
    TOOL_CALL_END = "tool_call_end"
    CITATION = "citation"
    UI_BLOCK = "ui_block"
    ERROR = "error"
    DONE = "done"


class UIBlockType(str, Enum):
    """Types of Generative UI blocks."""
    INFO_CARD = "info_card"
    TABLE = "table"
    CHART = "chart"


class ToolType(str, Enum):
    """Types of tools available to the agent."""
    SEARCH_DOCUMENTS = "search_documents"
    READ_PDF = "read_pdf"
    ANALYZE_CONTENT = "analyze_content"


# ============================================================
# Request Models
# ============================================================

class ChatRequest(BaseModel):
    """Request payload for initiating a chat session."""
    message: str = Field(..., min_length=1, max_length=4000, description="User's message/query")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for context")


# ============================================================
# Citation Models
# ============================================================

class Citation(BaseModel):
    """A citation reference to a specific location in a PDF document."""
    id: int = Field(..., ge=1, description="Citation number (1-indexed)")
    document_name: str = Field(..., description="Name of the PDF document")
    page_number: int = Field(..., ge=1, description="Page number in the document")
    text_snippet: str = Field(..., description="Relevant text excerpt")
    start_char: Optional[int] = Field(None, description="Start character position for highlighting")
    end_char: Optional[int] = Field(None, description="End character position for highlighting")


# ============================================================
# UI Block Models
# ============================================================

class InfoCardData(BaseModel):
    """Data for an info card UI block."""
    title: str
    content: str
    icon: Optional[str] = None  # Emoji or icon name


class TableData(BaseModel):
    """Data for a table UI block."""
    headers: list[str]
    rows: list[list[str]]
    caption: Optional[str] = None


class ChartData(BaseModel):
    """Data for a chart UI block."""
    chart_type: str = Field(..., pattern="^(bar|line|pie)$")
    labels: list[str]
    values: list[float]
    title: Optional[str] = None


class UIBlock(BaseModel):
    """A Generative UI block that can be rendered in the chat."""
    type: UIBlockType
    data: InfoCardData | TableData | ChartData


# ============================================================
# Stream Event Models
# ============================================================

class TextChunkEvent(BaseModel):
    """A chunk of text content being streamed."""
    event: EventType = EventType.TEXT_CHUNK
    content: str


class ToolCallStartEvent(BaseModel):
    """Indicates a tool call has started."""
    event: EventType = EventType.TOOL_CALL_START
    tool_type: ToolType
    tool_name: str
    description: str  # User-friendly description like "Searching documents..."


class ToolCallEndEvent(BaseModel):
    """Indicates a tool call has completed."""
    event: EventType = EventType.TOOL_CALL_END
    tool_type: ToolType
    tool_name: str
    success: bool
    result_summary: Optional[str] = None


class CitationEvent(BaseModel):
    """A citation being added to the response."""
    event: EventType = EventType.CITATION
    citation: Citation


class UIBlockEvent(BaseModel):
    """A UI block being added to the response."""
    event: EventType = EventType.UI_BLOCK
    block: UIBlock


class ErrorEvent(BaseModel):
    """An error occurred during processing."""
    event: EventType = EventType.ERROR
    message: str
    recoverable: bool = True


class DoneEvent(BaseModel):
    """Indicates the stream is complete."""
    event: EventType = EventType.DONE
    total_tokens: Optional[int] = None


StreamEvent = TextChunkEvent | ToolCallStartEvent | ToolCallEndEvent | CitationEvent | UIBlockEvent | ErrorEvent | DoneEvent


# ============================================================
# Response Models
# ============================================================

class ChatResponse(BaseModel):
    """Response after initiating a chat request."""
    job_id: str = Field(..., description="Unique job identifier for streaming")
    status: str = Field(default="queued", description="Initial job status")


class JobStatus(BaseModel):
    """Status of a queued job."""
    job_id: str
    status: str  # queued, started, finished, failed
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


# ============================================================
# PDF Models
# ============================================================

class PDFMetadata(BaseModel):
    """Metadata about an available PDF document."""
    filename: str
    title: Optional[str] = None
    page_count: int
    size_bytes: int


class PDFPage(BaseModel):
    """Content of a single PDF page."""
    page_number: int
    text: str
    word_count: int


class PDFDocument(BaseModel):
    """Full PDF document with all pages."""
    filename: str
    metadata: PDFMetadata
    pages: list[PDFPage]


# ============================================================
# Agent State Models (for LangGraph)
# ============================================================

class AgentState(BaseModel):
    """State passed between LangGraph nodes."""
    query: str
    conversation_id: Optional[str] = None
    messages: list[dict[str, Any]] = Field(default_factory=list)
    documents: list[PDFDocument] = Field(default_factory=list)
    relevant_pages: list[tuple[str, int, str]] = Field(default_factory=list)  # (filename, page, text)
    citations: list[Citation] = Field(default_factory=list)
    response_chunks: list[str] = Field(default_factory=list)
    ui_blocks: list[UIBlock] = Field(default_factory=list)
    current_step: str = "initial"
    error: Optional[str] = None
