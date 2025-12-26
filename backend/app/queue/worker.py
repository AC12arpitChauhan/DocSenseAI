"""
Redis Queue worker for processing chat jobs.
Handles async job execution with the LangGraph agent.
"""
import os
import logging
from redis import Redis
from rq import Worker, Queue
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def get_redis_connection() -> Redis:
    """Create a Redis connection."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    return Redis.from_url(redis_url)


def process_chat_job(job_id: str, query: str, conversation_id: str | None = None) -> dict:
    """
    Process a chat job using the LangGraph agent.
    
    This function is called by the RQ worker to execute the agent.
    Events are streamed via Redis pub/sub during execution.
    
    Args:
        job_id: Unique job identifier for streaming
        query: User's question/query
        conversation_id: Optional conversation ID for context
        
    Returns:
        Dictionary with job results
    """
    from app.langgraph import run_agent
    
    logger.info(f"Processing job {job_id}: {query[:100]}...")
    
    try:
        # Run the agent (this will stream events via Redis pub/sub)
        final_state = run_agent(job_id, query, conversation_id)
        
        logger.info(f"Job {job_id} completed successfully")
        
        return {
            "job_id": job_id,
            "status": "completed",
            "response": final_state.get("final_response", ""),
            "citations": [c.model_dump() for c in final_state.get("citations", [])],
            "error": final_state.get("error"),
        }
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        
        # Attempt to notify the client of the error
        from app.streaming import get_stream_publisher
        publisher = get_stream_publisher()
        publisher.publish_error(job_id, str(e), recoverable=False)
        publisher.publish_done(job_id)
        
        return {
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
        }


def run_worker():
    """Run the RQ worker process."""
    redis_conn = get_redis_connection()
    queues = [Queue("chat", connection=redis_conn)]
    worker = Worker(queues, connection=redis_conn)
    logger.info("Starting RQ worker...")
    worker.work()


if __name__ == "__main__":
    run_worker()
