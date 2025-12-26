"""
Chat API endpoints for the AI Search application.
Handles chat requests, job enqueueing, and SSE streaming.
"""
import asyncio
import json
import os
import uuid
import shutil
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from redis import Redis
from rq import Queue
from sse_starlette.sse import EventSourceResponse

from app.models import (
    ChatRequest,
    ChatResponse,
    JobStatus,
    PDFMetadata,
    EventType,
)
from app.queue.worker import process_chat_job
from app.streaming import get_stream_subscriber
from app.pdf import get_pdf_processor

router = APIRouter(prefix="/api", tags=["chat"])


def get_redis_connection() -> Redis:
    """Get Redis connection."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    return Redis.from_url(redis_url, decode_responses=True)


def get_chat_queue() -> Queue:
    """Get the chat processing queue."""
    return Queue("chat", connection=get_redis_connection())


@router.post("/chat", response_model=ChatResponse)
async def create_chat(request: ChatRequest) -> ChatResponse:
    """
    Submit a chat message for processing.
    
    The message is queued for async processing by the LangGraph agent.
    Returns a job_id that can be used to stream the response.
    """
    job_id = str(uuid.uuid4())
    
    try:
        queue = get_chat_queue()
        # RQ uses positional args for the function, kwargs for RQ-specific options
        job = queue.enqueue(
            process_chat_job,
            args=(job_id, request.message, request.conversation_id),
            job_id=job_id,  # RQ job ID for tracking
            job_timeout=300,  # 5 minute timeout
        )
        
        return ChatResponse(
            job_id=job_id,
            status="queued"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to queue chat job: {str(e)}"
        )


@router.get("/chat/{job_id}/stream")
async def stream_chat_response(job_id: str, request: Request) -> EventSourceResponse:
    """
    Stream the chat response for a given job.
    
    Uses Server-Sent Events (SSE) to stream events in real-time.
    Events include: text_chunk, tool_call_start, tool_call_end, citation, ui_block, done
    
    Architecture:
    - Uses buffered replay + live pub/sub to guarantee no lost events
    - First replays any buffered events (solves race condition)
    - Then subscribes to live events
    - Automatically deduplicates
    """
    
    async def event_generator() -> AsyncGenerator[dict, None]:
        """Generate SSE events with buffered replay."""
        subscriber = get_stream_subscriber()
        
        # Set a timeout to avoid hanging indefinitely
        timeout_seconds = 300  # 5 minutes
        start_time = asyncio.get_event_loop().time()
        
        try:
            # stream_events() handles:
            # 1. Replaying buffered events
            # 2. Subscribing to live pub/sub
            # 3. Deduplication
            for event_data in subscriber.stream_events(job_id):
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Check timeout
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > timeout_seconds:
                    yield {
                        "event": "error",
                        "data": json.dumps({"event": "error", "message": "Stream timeout", "recoverable": False})
                    }
                    break
                
                event_type = event_data.get("event", "message")
                
                yield {
                    "event": event_type,
                    "data": json.dumps(event_data)
                }
                
                # Stop if we receive a done event
                if event_type == EventType.DONE.value:
                    break
                
                # Yield control to event loop
                await asyncio.sleep(0)
                
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"event": "error", "message": str(e), "recoverable": False})
            }
    
    return EventSourceResponse(event_generator())


@router.get("/chat/{job_id}/status", response_model=JobStatus)
async def get_job_status(job_id: str) -> JobStatus:
    """
    Get the current status of a chat job.
    """
    from datetime import datetime
    from rq.job import Job
    
    try:
        redis_conn = get_redis_connection()
        job = Job.fetch(job_id, connection=redis_conn)
        
        status_map = {
            "queued": "queued",
            "started": "started",
            "finished": "finished",
            "failed": "failed",
        }
        
        return JobStatus(
            job_id=job_id,
            status=status_map.get(job.get_status(), "unknown"),
            created_at=job.created_at or datetime.now(),
            started_at=job.started_at,
            completed_at=job.ended_at,
            error=str(job.exc_info) if job.is_failed else None,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Job not found: {job_id}"
        )


# ============================================================
# PDF Endpoints
# ============================================================

@router.get("/pdfs", response_model=list[PDFMetadata])
async def list_pdfs() -> list[PDFMetadata]:
    """
    List all available PDF documents.
    """
    processor = get_pdf_processor()
    return processor.list_pdfs()


@router.post("/pdfs/upload")
async def upload_pdf(file: UploadFile = File(...)) -> dict:
    """
    Upload a PDF document.
    
    The PDF will be saved to the pdfs directory and immediately available for search.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate content type
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")
    
    processor = get_pdf_processor()
    pdf_directory = os.getenv("PDF_DIRECTORY", "./pdfs")
    
    # Ensure directory exists
    os.makedirs(pdf_directory, exist_ok=True)
    
    # Sanitize filename (remove path separators)
    safe_filename = os.path.basename(file.filename)
    file_path = os.path.join(pdf_directory, safe_filename)
    
    # Check if file already exists
    if os.path.exists(file_path):
        # Add unique suffix
        name, ext = os.path.splitext(safe_filename)
        safe_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(pdf_directory, safe_filename)
    
    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Clear the processor cache to pick up the new file
        if hasattr(processor, '_cache'):
            processor._cache.clear()
        
        # Get page count by extracting the document
        doc = processor.extract_document(safe_filename, use_cache=False)
        page_count = len(doc.pages) if doc else 0
        
        return {
            "status": "success",
            "message": f"PDF '{safe_filename}' uploaded successfully",
            "filename": safe_filename,
            "page_count": page_count,
            "size_bytes": os.path.getsize(file_path)
        }
        
    except Exception as e:
        # Clean up on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")
    finally:
        file.file.close()


@router.get("/pdfs/{filename}")
async def get_pdf(filename: str) -> FileResponse:
    """
    Get a PDF file by filename.
    Served with inline disposition for browser viewing.
    """
    processor = get_pdf_processor()
    pdf_path = processor.get_pdf_path(filename)
    
    if not pdf_path:
        raise HTTPException(
            status_code=404,
            detail=f"PDF not found: {filename}"
        )
    
    # Use inline disposition so PDF displays in iframe/viewer
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        }
    )


@router.delete("/pdfs/{filename}")
async def delete_pdf(filename: str) -> dict:
    """
    Delete a PDF document.
    """
    processor = get_pdf_processor()
    pdf_path = processor.get_pdf_path(filename)
    
    if not pdf_path:
        raise HTTPException(status_code=404, detail=f"PDF not found: {filename}")
    
    try:
        os.remove(pdf_path)
        # Clear cache
        if hasattr(processor, '_cache'):
            processor._cache.clear()
        
        return {
            "status": "success",
            "message": f"PDF '{filename}' deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete PDF: {str(e)}")


@router.get("/pdfs/{filename}/page/{page_number}")
async def get_pdf_page_text(filename: str, page_number: int) -> dict:
    """
    Get the text content of a specific PDF page.
    """
    processor = get_pdf_processor()
    page = processor.extract_page(filename, page_number)
    
    if not page:
        raise HTTPException(
            status_code=404,
            detail=f"Page {page_number} not found in {filename}"
        )
    
    return {
        "filename": filename,
        "page_number": page.page_number,
        "text": page.text,
        "word_count": page.word_count
    }


@router.get("/pdfs/{filename}/search")
async def search_pdf(filename: str, query: str, max_results: int = 10) -> dict:
    """
    Search for text within a specific PDF.
    """
    processor = get_pdf_processor()
    results = processor.search_text(query, filename=filename, max_results=max_results)
    
    return {
        "filename": filename,
        "query": query,
        "results": [
            {
                "page_number": page_num,
                "context": context,
                "start_position": start,
                "end_position": end
            }
            for _, page_num, context, start, end in results
        ]
    }
