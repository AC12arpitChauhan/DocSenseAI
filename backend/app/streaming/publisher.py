"""
SSE streaming publisher module.
Handles publishing events to Redis pub/sub for real-time streaming to clients.

Architecture:
- Events are buffered in Redis Lists BEFORE being published to pub/sub
- SSE subscribers first replay buffered events, then subscribe to live events
- This guarantees no events are lost to race conditions
"""
import json
import os
import time
import logging
from typing import Optional, List, Generator
import redis
from contextlib import contextmanager

from app.models import (
    StreamEvent,
    TextChunkEvent,
    ToolCallStartEvent,
    ToolCallEndEvent,
    CitationEvent,
    UIBlockEvent,
    ErrorEvent,
    DoneEvent,
    EventType,
    ToolType,
    Citation,
    UIBlock,
)

# Set up logging
logger = logging.getLogger(__name__)


class JobEventBuffer:
    """
    Redis-backed event buffer for storing events per job.
    Uses Redis Lists for ordered, persistent storage.
    """
    
    EVENT_LIST_KEY = "job:events:{job_id}"
    DONE_KEY = "job:done:{job_id}"
    EVENT_TTL_SECONDS = 600  # 10 minutes
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def _get_event_key(self, job_id: str) -> str:
        return self.EVENT_LIST_KEY.format(job_id=job_id)
    
    def _get_done_key(self, job_id: str) -> str:
        return self.DONE_KEY.format(job_id=job_id)
    
    def append_event(self, job_id: str, event_json: str) -> None:
        """Append an event to the job's buffer."""
        key = self._get_event_key(job_id)
        self.redis.rpush(key, event_json)
        self.redis.expire(key, self.EVENT_TTL_SECONDS)
        logger.debug(f"[BUFFER] Appended event to {job_id}, total: {self.redis.llen(key)}")
    
    def mark_done(self, job_id: str) -> None:
        """Mark a job as completed."""
        done_key = self._get_done_key(job_id)
        self.redis.set(done_key, "1", ex=self.EVENT_TTL_SECONDS)
        logger.info(f"[BUFFER] Job {job_id} marked as DONE")
    
    def is_done(self, job_id: str) -> bool:
        """Check if job is completed."""
        return self.redis.exists(self._get_done_key(job_id)) > 0
    
    def get_all_events(self, job_id: str) -> List[str]:
        """Get all buffered events for a job."""
        key = self._get_event_key(job_id)
        events = self.redis.lrange(key, 0, -1)
        logger.debug(f"[BUFFER] Retrieved {len(events)} events for {job_id}")
        return events
    
    def get_events_from(self, job_id: str, start_index: int) -> List[str]:
        """Get events from a specific index onwards."""
        key = self._get_event_key(job_id)
        return self.redis.lrange(key, start_index, -1)
    
    def get_event_count(self, job_id: str) -> int:
        """Get the number of buffered events."""
        key = self._get_event_key(job_id)
        return self.redis.llen(key)


class StreamPublisher:
    """
    Publishes streaming events to Redis pub/sub channels.
    Events are buffered BEFORE publishing to pub/sub.
    """
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis: Optional[redis.Redis] = None
        self._event_buffer: Optional[JobEventBuffer] = None
    
    @property
    def redis_client(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(self.redis_url, decode_responses=True)
        return self._redis
    
    @property
    def event_buffer(self) -> JobEventBuffer:
        if self._event_buffer is None:
            self._event_buffer = JobEventBuffer(self.redis_client)
        return self._event_buffer
    
    def _get_channel_name(self, job_id: str) -> str:
        return f"chat:stream:{job_id}"
    
    def _serialize_event(self, event: StreamEvent) -> str:
        if hasattr(event, "model_dump"):
            return json.dumps(event.model_dump())
        return json.dumps(event)
    
    def publish_event(self, job_id: str, event: StreamEvent) -> None:
        """
        Publish a streaming event.
        CRITICAL: Buffer FIRST, then publish to pub/sub.
        """
        channel = self._get_channel_name(job_id)
        message = self._serialize_event(event)
        
        event_type = getattr(event, 'event', 'unknown')
        logger.info(f"[PUBLISH] {job_id[:8]}... event={event_type}")
        
        # STEP 1: Buffer the event
        self.event_buffer.append_event(job_id, message)
        
        # STEP 2: Publish to pub/sub
        self.redis_client.publish(channel, message)
        
        # STEP 3: Mark done if final event
        if hasattr(event, 'event') and event.event == EventType.DONE:
            self.event_buffer.mark_done(job_id)
    
    def publish_text_chunk(self, job_id: str, content: str) -> None:
        event = TextChunkEvent(content=content)
        self.publish_event(job_id, event)
    
    def publish_tool_start(
        self, job_id: str, tool_type: ToolType, tool_name: str, description: str
    ) -> None:
        event = ToolCallStartEvent(
            tool_type=tool_type, tool_name=tool_name, description=description
        )
        self.publish_event(job_id, event)
    
    def publish_tool_end(
        self, job_id: str, tool_type: ToolType, tool_name: str,
        success: bool, result_summary: Optional[str] = None
    ) -> None:
        event = ToolCallEndEvent(
            tool_type=tool_type, tool_name=tool_name,
            success=success, result_summary=result_summary
        )
        self.publish_event(job_id, event)
    
    def publish_citation(self, job_id: str, citation: Citation) -> None:
        event = CitationEvent(citation=citation)
        self.publish_event(job_id, event)
    
    def publish_ui_block(self, job_id: str, block: UIBlock) -> None:
        event = UIBlockEvent(block=block)
        self.publish_event(job_id, event)
    
    def publish_error(self, job_id: str, message: str, recoverable: bool = True) -> None:
        event = ErrorEvent(message=message, recoverable=recoverable)
        self.publish_event(job_id, event)
    
    def publish_done(self, job_id: str, total_tokens: Optional[int] = None) -> None:
        event = DoneEvent(total_tokens=total_tokens)
        self.publish_event(job_id, event)
    
    def close(self) -> None:
        if self._redis is not None:
            self._redis.close()
            self._redis = None


class StreamSubscriber:
    """
    Subscribes to streaming events from Redis.
    Replays buffered events first, then listens for live events.
    """
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis: Optional[redis.Redis] = None
    
    @property
    def redis_client(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(self.redis_url, decode_responses=True)
        return self._redis
    
    def _get_channel_name(self, job_id: str) -> str:
        return f"chat:stream:{job_id}"
    
    def get_event_buffer(self) -> JobEventBuffer:
        return JobEventBuffer(self.redis_client)
    
    def stream_events(self, job_id: str) -> Generator[dict, None, None]:
        """
        Stream all events for a job with buffer replay.
        
        CRITICAL: This generator must keep yielding until 'done' event.
        If no events yet, it waits (with timeout checks).
        """
        buffer = self.get_event_buffer()
        channel = self._get_channel_name(job_id)
        
        logger.info(f"[SSE] Starting stream for job {job_id[:8]}...")
        
        # Check if job already completed - replay and exit
        if buffer.is_done(job_id):
            logger.info(f"[SSE] Job {job_id[:8]}... already done, replaying buffer")
            for event_json in buffer.get_all_events(job_id):
                try:
                    yield json.loads(event_json)
                except json.JSONDecodeError:
                    continue
            return
        
        # Subscribe to pub/sub
        pubsub = self.redis_client.pubsub()
        pubsub.subscribe(channel)
        
        try:
            sent_count = 0
            start_time = time.time()
            max_wait_seconds = 300  # 5 minute max
            
            # PHASE 1: Replay buffered events
            buffered_events = buffer.get_all_events(job_id)
            logger.info(f"[SSE] Replaying {len(buffered_events)} buffered events")
            
            for event_json in buffered_events:
                try:
                    event_data = json.loads(event_json)
                    logger.debug(f"[SSE] Replay event: {event_data.get('event')}")
                    yield event_data
                    sent_count += 1
                    
                    if event_data.get("event") == EventType.DONE.value:
                        logger.info(f"[SSE] Done event in buffer, closing")
                        return
                except json.JSONDecodeError:
                    sent_count += 1
                    continue
            
            # PHASE 2: Wait for live events
            logger.info(f"[SSE] Entering live listen phase, sent_count={sent_count}")
            
            while True:
                # Check timeout
                elapsed = time.time() - start_time
                if elapsed > max_wait_seconds:
                    logger.warning(f"[SSE] Timeout after {elapsed:.0f}s")
                    yield {"event": "error", "message": "Stream timeout"}
                    return
                
                # Check pub/sub for new messages
                message = pubsub.get_message(timeout=1.0)  # 1 second timeout
                
                if message and message["type"] == "message":
                    # Live event received
                    try:
                        event_data = json.loads(message["data"])
                        event_type = event_data.get("event", "unknown")
                        logger.info(f"[SSE] Live event: {event_type}")
                        
                        # Get new events from buffer (for dedup)
                        current_count = buffer.get_event_count(job_id)
                        
                        if current_count > sent_count:
                            # Yield new events from buffer
                            new_events = buffer.get_events_from(job_id, sent_count)
                            for ev_json in new_events:
                                try:
                                    ev = json.loads(ev_json)
                                    yield ev
                                    sent_count += 1
                                    
                                    if ev.get("event") == EventType.DONE.value:
                                        logger.info(f"[SSE] Done event, closing")
                                        return
                                except json.JSONDecodeError:
                                    sent_count += 1
                                    continue
                                    
                    except json.JSONDecodeError:
                        continue
                else:
                    # No live message - check if job completed
                    if buffer.is_done(job_id):
                        # Get any remaining events
                        current_count = buffer.get_event_count(job_id)
                        if current_count > sent_count:
                            new_events = buffer.get_events_from(job_id, sent_count)
                            for ev_json in new_events:
                                try:
                                    yield json.loads(ev_json)
                                except json.JSONDecodeError:
                                    continue
                        logger.info(f"[SSE] Job done (checked), closing")
                        return
                    
                    # Log waiting status every 10 seconds
                    if int(elapsed) % 10 == 0 and int(elapsed) > 0:
                        logger.debug(f"[SSE] Waiting for events... {elapsed:.0f}s")
                        
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()
            logger.info(f"[SSE] Stream closed for {job_id[:8]}...")
    
    def close(self) -> None:
        if self._redis is not None:
            self._redis.close()
            self._redis = None


# Singleton instances
_publisher: Optional[StreamPublisher] = None
_subscriber: Optional[StreamSubscriber] = None


def get_stream_publisher() -> StreamPublisher:
    global _publisher
    if _publisher is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _publisher = StreamPublisher(redis_url)
    return _publisher


def get_stream_subscriber() -> StreamSubscriber:
    global _subscriber
    if _subscriber is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _subscriber = StreamSubscriber(redis_url)
    return _subscriber


def get_event_buffer() -> JobEventBuffer:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url, decode_responses=True)
    return JobEventBuffer(redis_client)
