"""
AgentShield WebSocket Connection Manager.

Manages active WebSocket connections and broadcasts
audit events to all connected dashboard clients in real time.

WHY WebSockets:
- Real-time dashboard updates with push-based streaming
- WebSockets provide low-latency event streaming
- Dashboard sees events within milliseconds of WAF decisions

HOW it works:
1. Dashboard client connects to WS /ws/events
2. ConnectionManager tracks the connection
3. When a WAF decision occurs, the audit service calls broadcast()
4. All connected dashboards receive the event instantly
"""

import json
from typing import Any

from fastapi import WebSocket

from app.logging_config import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time event broadcasting.

    Thread-safe for use with async FastAPI.
    """

    def __init__(self) -> None:
        """Initialise with empty connection set."""
        self._active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self._active_connections.append(websocket)
        logger.info(
            f"WebSocket client connected. Total: {len(self._active_connections)}",
            extra={"component": "websocket"},
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a disconnected WebSocket."""
        if websocket in self._active_connections:
            self._active_connections.remove(websocket)
        logger.info(
            f"WebSocket client disconnected. Total: {len(self._active_connections)}",
            extra={"component": "websocket"},
        )

    async def broadcast(self, data: dict[str, Any]) -> None:
        """
        Broadcast an event to all connected WebSocket clients.

        Disconnected clients are automatically removed.

        Args:
            data: The event data to broadcast (will be JSON-serialized).
        """
        if not self._active_connections:
            return

        message = json.dumps(data, default=str)
        disconnected: list[WebSocket] = []

        for connection in self._active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    @property
    def active_count(self) -> int:
        """Number of currently connected clients."""
        return len(self._active_connections)


# Singleton instance — shared across the application
ws_manager = ConnectionManager()
