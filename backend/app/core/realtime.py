import json
import asyncio
import logging
from typing import Set, Dict, Any, List
from collections import deque
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("vyaparimitra.realtime")

class RealtimeManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.recent_events: deque = deque(maxlen=50)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        event = {
            "type": event_type,
            "data": data,
            "timestamp": asyncio.get_event_loop().time()
        }
        self.recent_events.append(event)
        
        if not self.active_connections:
            return

        message = json.dumps(event)
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    def get_recent_events(self, limit: int = 20) -> List[Dict[str, Any]]:
        events = list(self.recent_events)
        events.reverse()
        return events[:limit]

realtime_manager = RealtimeManager()

