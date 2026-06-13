"""
Pit Wall — aiohttp WebSocket server.

Endpoints:
  GET /health  → {"status": "ok", "source": "bridge"|"no_live_session", "connectedClients": N}
  GET /state   → current RaceState JSON snapshot
  GET /ws      → WebSocket upgrade; broadcasts on each update
"""
import asyncio
import json
import logging
import time

from aiohttp import web

logger = logging.getLogger("pitwall.server")


class WebSocketServer:
    def __init__(self, config: dict, queue: asyncio.Queue):
        self.port = config.get("ws_port", 8771)
        self.heartbeat_interval = config.get("heartbeat_interval", 30)
        self.queue = queue
        self._clients: set[web.WebSocketResponse] = set()
        self._current_state: dict | None = None
        self._app = web.Application()
        self._app.router.add_get("/health", self._health)
        self._app.router.add_get("/state", self._state)
        self._app.router.add_get("/ws", self._ws_handler)

    async def run(self):
        runner = web.AppRunner(self._app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", self.port)
        await site.start()
        logger.info("WebSocket server listening on ws://0.0.0.0:%d/ws", self.port)

        # Broadcast loop
        while True:
            try:
                state = await asyncio.wait_for(self.queue.get(), timeout=self.heartbeat_interval)
                self._current_state = state
                await self._broadcast(state)
            except asyncio.TimeoutError:
                # Send heartbeat ping to detect dead connections
                dead = set()
                for ws in self._clients:
                    try:
                        await ws.ping()
                    except Exception:
                        dead.add(ws)
                for ws in dead:
                    self._clients.discard(ws)

    async def _broadcast(self, state: dict):
        if not self._clients:
            return
        payload = json.dumps(state)
        dead = set()
        for ws in list(self._clients):
            try:
                await ws.send_str(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._clients.discard(ws)
        logger.debug("Broadcast to %d client(s)", len(self._clients) - len(dead))

    async def _health(self, request: web.Request) -> web.Response:
        source = "bridge" if self._current_state else "no_live_session"
        return web.json_response({
            "status": "ok",
            "source": source,
            "connectedClients": len(self._clients),
            "lastUpdate": self._current_state.get("updatedAt") if self._current_state else None,
        })

    async def _state(self, request: web.Request) -> web.Response:
        if self._current_state is None:
            return web.json_response({"error": "no state available"}, status=503)
        return web.json_response(self._current_state)

    async def _ws_handler(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self._clients.add(ws)
        client_addr = request.remote
        logger.info("Client connected: %s (total=%d)", client_addr, len(self._clients))

        # Send current state immediately if available
        if self._current_state is not None:
            try:
                await ws.send_str(json.dumps(self._current_state))
            except Exception:
                pass

        try:
            async for msg in ws:
                pass  # We don't process inbound messages from frontend
        finally:
            self._clients.discard(ws)
            logger.info("Client disconnected: %s (total=%d)", client_addr, len(self._clients))

        return ws
