"""
aiohttp WebSocket server exposing RaceState to the frontend.

Routes:
  GET /health  — health check
  GET /state   — latest RaceState snapshot as JSON
  GET /ws      — WebSocket upgrade; broadcasts every update
"""
import asyncio
import json
import logging
import weakref

from aiohttp import web

logger = logging.getLogger("pitwall.server")


class WebSocketServer:
    def __init__(self, config: dict, queue: asyncio.Queue):
        self._port = config.get("ws_port", 8771)
        self._queue = queue
        self._clients: weakref.WeakSet = weakref.WeakSet()
        self._latest_state: dict | None = None

    async def _ws_handler(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse(heartbeat=30)
        await ws.prepare(request)
        self._clients.add(ws)
        logger.info("Client connected (total %d)", len(self._clients))

        # send current snapshot immediately
        if self._latest_state:
            await ws.send_str(json.dumps(self._latest_state))

        try:
            async for _ in ws:
                pass  # we don't expect messages from the client
        except Exception:
            pass
        finally:
            logger.info("Client disconnected")
        return ws

    async def _state_handler(self, _request: web.Request) -> web.Response:
        if self._latest_state is None:
            return web.json_response(
                {"error": "no_state_yet"}, status=503
            )
        return web.json_response(self._latest_state)

    async def _health_handler(self, _request: web.Request) -> web.Response:
        return web.json_response(
            {
                "status": "ok",
                "source": "bridge" if self._latest_state else "no_live_session",
                "connectedClients": len(self._clients),
            }
        )

    async def _broadcast_loop(self):
        while True:
            state = await self._queue.get()
            self._latest_state = state
            payload = json.dumps(state)
            dead = []
            for ws in list(self._clients):
                try:
                    await ws.send_str(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self._clients.discard(ws)

    async def run(self):
        app = web.Application()
        app.router.add_get("/ws", self._ws_handler)
        app.router.add_get("/state", self._state_handler)
        app.router.add_get("/health", self._health_handler)

        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", self._port)
        await site.start()
        logger.info("Server listening on ws://localhost:%d", self._port)

        await self._broadcast_loop()
