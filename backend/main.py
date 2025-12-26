"""
AI Search Chat API - FastAPI Application
A Perplexity-style search chat with LangGraph agent, SSE streaming, and PDF citations.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.api import chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup: Initialize any resources
    from app.pdf import get_pdf_processor
    
    # Ensure PDF directory exists
    processor = get_pdf_processor()
    print(f"📁 PDF directory: {processor.pdf_directory}")
    print(f"📚 Found {len(processor.list_pdfs())} PDF documents")
    
    yield
    
    # Shutdown: Cleanup resources
    from app.streaming import get_stream_publisher, get_stream_subscriber
    get_stream_publisher().close()
    get_stream_subscriber().close()
    print("👋 Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="AI Search Chat API",
    description="A Perplexity-style AI search chat with real-time streaming, tool visibility, and PDF citations.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development
        "http://127.0.0.1:3000",
        "http://frontend:3000",   # Docker network
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chat_router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "AI Search Chat API",
        "version": "1.0.0",
        "status": "running",
        "docs_url": "/docs",
        "endpoints": {
            "chat": "/api/chat",
            "stream": "/api/chat/{job_id}/stream",
            "pdfs": "/api/pdfs",
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    import redis
    
    health = {
        "status": "healthy",
        "services": {
            "api": "up",
            "redis": "unknown",
        }
    }
    
    # Check Redis connection
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = redis.from_url(redis_url)
        r.ping()
        health["services"]["redis"] = "up"
    except Exception as e:
        health["services"]["redis"] = f"down: {str(e)}"
        health["status"] = "degraded"
    
    return health


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
