"""
Pit Wall — Timing71 WAMP client.

Steps:
1. Fetch relay list from timing71.org/relays
2. Pick the relay with the fewest connections
3. Subscribe to DIRECTORY topic
4. Find WEC / Le Mans service
5. Subscribe to STATE_PUBLISH/<uuid>
6. Normalize via normalizer.py
7. Push to server via asyncio Queue

Auto-reconnects with exponential backoff.
--dump mode logs raw CTD messages to file.
"""
import asyncio
import json
import logging
import time
from pathlib import Path

import aiohttp

from .normalizer import normalize_ctd

logger = logging.getLogger("pitwall.timing71")

RELAY_DISCOVERY_URL = "https://www.timing71.org/relays"
DIRECTORY_TOPIC = "livetiming.directory"
STATE_PUBLISH_PREFIX = "livetiming.service.state."


class Timing71Client:
    def __init__(self, config: dict, queue: asyncio.Queue, dump: bool = False):
        self.config = config
        self.queue = queue
        self.dump = dump
        self._dump_file = None
        self._running = True
        self._reconnect_max = config.get("reconnect_max_delay", 60)
        self._event_match = config.get("event_match", "Le Mans").lower()
        self._relay_url = config.get("relay_discovery_url", RELAY_DISCOVERY_URL)

    async def run(self):
        if self.dump:
            self._dump_file = open("ctd_dump.jsonl", "a")
            logger.info("CTD dump enabled → ctd_dump.jsonl")

        backoff = 1
        while self._running:
            try:
                await self._connect()
                backoff = 1  # reset on success
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("Connection failed: %s — retry in %ds", exc, backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, self._reconnect_max)

        if self._dump_file:
            self._dump_file.close()

    async def _fetch_relays(self) -> list[dict]:
        async with aiohttp.ClientSession() as session:
            async with session.get(self._relay_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                resp.raise_for_status()
                return await resp.json()

    def _pick_relay(self, relays: list[dict]) -> str:
        """Return WebSocket URL of relay with fewest active connections."""
        if not relays:
            raise RuntimeError("No relays available from discovery endpoint")
        # Sort by connection count ascending; fall back to first if field missing
        sorted_relays = sorted(relays, key=lambda r: r.get("connections", 0))
        relay = sorted_relays[0]
        url = relay.get("url") or relay.get("ws_url") or relay.get("endpoint")
        if not url:
            raise RuntimeError(f"Relay has no URL field: {relay}")
        logger.info("Selected relay: %s (connections=%s)", url, relay.get("connections", "?"))
        return url

    async def _connect(self):
        logger.info("Fetching relay list from %s", self._relay_url)
        relays = await self._fetch_relays()
        ws_url = self._pick_relay(relays)

        import websockets  # local import to keep startup fast

        logger.info("Connecting to relay WebSocket: %s", ws_url)
        async with websockets.connect(ws_url, ping_interval=20, ping_timeout=30) as ws:
            logger.info("Connected — waiting for DIRECTORY")
            await self._session(ws)

    async def _session(self, ws):
        """Main WAMP-lite session loop."""
        service_uuid = None
        subscribed = False

        async for raw in ws:
            msg = json.loads(raw)
            if not isinstance(msg, list) or len(msg) < 2:
                continue

            msg_type = msg[0]

            # WAMP WELCOME (type 0)
            if msg_type == 0:
                logger.debug("WAMP WELCOME received")
                # Subscribe to directory
                subscribe_msg = json.dumps([32, 1, {}, DIRECTORY_TOPIC])
                await ws.send(subscribe_msg)
                continue

            # WAMP SUBSCRIBED (type 33)
            if msg_type == 33:
                logger.debug("Subscription confirmed: %s", msg)
                continue

            # WAMP EVENT (type 36)
            if msg_type == 36:
                details = msg[1] if len(msg) > 1 else {}
                args = msg[2] if len(msg) > 2 else []
                kwargs = msg[3] if len(msg) > 3 else {}

                topic = details.get("topic", "") if isinstance(details, dict) else ""

                if topic == DIRECTORY_TOPIC or DIRECTORY_TOPIC in str(msg):
                    # Directory update — look for matching service
                    payload = args[0] if args else kwargs
                    uuid = self._find_service(payload)
                    if uuid and uuid != service_uuid:
                        service_uuid = uuid
                        state_topic = f"{STATE_PUBLISH_PREFIX}{uuid}"
                        logger.info("Subscribing to state topic: %s", state_topic)
                        sub_msg = json.dumps([32, 2, {}, state_topic])
                        await ws.send(sub_msg)
                        subscribed = True
                    continue

                if subscribed and service_uuid and service_uuid in str(msg):
                    payload = args[0] if args else (kwargs or msg[-1] if msg else {})
                    await self._handle_state(payload)
                    continue

    def _find_service(self, directory: object) -> str | None:
        """Search directory payload for Le Mans / WEC service UUID."""
        match = self._event_match
        if isinstance(directory, dict):
            for uuid, info in directory.items():
                name = str(info.get("name", "") + info.get("description", "")).lower()
                if match in name:
                    logger.info("Found service: uuid=%s name=%s", uuid, info.get("name"))
                    return uuid
        elif isinstance(directory, list):
            for entry in directory:
                if isinstance(entry, dict):
                    name = str(entry.get("name", "") + entry.get("description", "")).lower()
                    if match in name:
                        return entry.get("uuid") or entry.get("id")
        return None

    async def _handle_state(self, payload: object):
        if self.dump and self._dump_file:
            self._dump_file.write(json.dumps({"ts": time.time(), "payload": payload}) + "\n")
            self._dump_file.flush()

        try:
            state = normalize_ctd(payload)
            # Non-blocking put — drop if queue full (prefer fresh data)
            try:
                self.queue.put_nowait(state)
            except asyncio.QueueFull:
                # Drain one item then put
                try:
                    self.queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                self.queue.put_nowait(state)
        except Exception as exc:
            logger.warning("Failed to normalize CTD payload: %s", exc)
