#!/usr/bin/env python3
"""
Pit Wall — Bridge entry point.
Connects to Timing71 WAMP relay and serves normalized RaceState over WebSocket.
"""
import argparse
import asyncio
import logging
import sys
from pathlib import Path

import yaml

from src.server import WebSocketServer
from src.timing71_client import Timing71Client


def load_config(config_path: str) -> dict:
    path = Path(config_path)
    if not path.exists():
        print(f"Config file not found: {config_path}", file=sys.stderr)
        sys.exit(1)
    with path.open() as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(description="Pit Wall — Le Mans timing bridge")
    parser.add_argument(
        "--config", default="config.yaml", help="Path to YAML config file"
    )
    parser.add_argument(
        "--dump", action="store_true", help="Log raw CTD data to file for debugging"
    )
    parser.add_argument(
        "--port", type=int, default=None, help="Override WebSocket port from config"
    )
    args = parser.parse_args()

    config = load_config(args.config)
    if args.port is not None:
        config["ws_port"] = args.port
        config["rest_port"] = args.port

    log_level = logging.DEBUG if args.dump else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(config.get("log_file", "bridge.log")),
        ],
    )
    logger = logging.getLogger("pitwall.main")
    logger.info("Starting Pit Wall bridge on port %d", config["ws_port"])

    queue: asyncio.Queue = asyncio.Queue(maxsize=10)
    server = WebSocketServer(config, queue)
    client = Timing71Client(config, queue, dump=args.dump)

    async def run():
        await asyncio.gather(
            server.run(),
            client.run(),
        )

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        logger.info("Interrupted — shutting down")


if __name__ == "__main__":
    main()
