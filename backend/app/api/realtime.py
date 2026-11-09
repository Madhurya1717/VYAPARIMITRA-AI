import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse
from backend.app.core.realtime import realtime_manager

router = APIRouter(prefix="/realtime", tags=["Real-Time Synchronization"])

@router.get("/events")
async def get_recent_events(limit: int = Query(20, ge=1, le=50)):
    return realtime_manager.get_recent_events(limit=limit)

@router.get("/stream")
async def stream_events():
    """
    Server-Sent Events (SSE) stream fallback for real-time updates.
    """
    async def event_generator():
        last_index = len(realtime_manager.recent_events)
        while True:
            current_events = list(realtime_manager.recent_events)
            if len(current_events) > last_index:
                new_events = current_events[last_index:]
                for ev in new_events:
                    yield f"data: {json.dumps(ev)}\n\n"
                last_index = len(current_events)
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

