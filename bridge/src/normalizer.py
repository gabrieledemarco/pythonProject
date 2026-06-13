"""
Pit Wall — CTD → RaceState normalizer.

Maps raw Timing71 CTD (Canonical Timing Data) to the RaceState schema
expected by the frontend. All fields are optional-safe with sensible defaults.

CTD column indices (WEC variant):
  0: position
  1: car number
  2: driver name (current)
  3: team
  4: car class / category
  5: gap to leader
  6: interval
  7: lap count
  8: last lap time
  9: best lap time
  10: S1
  11: S2
  12: S3
  13: pit status flag
  14: track progress (proprietary extension, may be absent)
"""
import re
import time
from typing import Any

# CTD column indices
COL_POS = 0
COL_NUMBER = 1
COL_DRIVER = 2
COL_TEAM = 3
COL_CLASS = 4
COL_GAP = 5
COL_INTERVAL = 6
COL_LAPS = 7
COL_LAST_LAP = 8
COL_BEST_LAP = 9
COL_S1 = 10
COL_S2 = 11
COL_S3 = 12
COL_PIT = 13
COL_TRACK_PROGRESS = 14

# Timing71 sector state flags → our status
SECTOR_STATUS_MAP = {
    "pb": "best",
    "sb": "best",
    "best": "best",
    "improved": "improved",
    "slow": "normal",
    "normal": "normal",
    None: "normal",
}

CATEGORY_ALIASES = {
    "hypercar": "HYPERCAR",
    "lmh": "HYPERCAR",
    "wec-h": "HYPERCAR",
    "lmp2": "LMP2",
    "p2": "LMP2",
    "lmgt3": "LMGT3",
    "gt3": "LMGT3",
    "gte": "LMGT3",
}

FLAG_ALIASES = {
    "green": "green",
    "yellow": "yellow",
    "red": "red",
    "sc": "sc",
    "safety car": "sc",
    "fcy": "fcy",
    "full course yellow": "fcy",
    "chequered": "chequered",
    "checkered": "chequered",
    "finish": "chequered",
}


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _map_category(raw: str) -> str:
    key = raw.lower().strip()
    return CATEGORY_ALIASES.get(key, "HYPERCAR")


def _map_flag(raw: str) -> str:
    key = raw.lower().strip()
    for alias, flag in FLAG_ALIASES.items():
        if alias in key:
            return flag
    return "green"


def _map_sector_status(raw: Any) -> str:
    if isinstance(raw, dict):
        raw = raw.get("status") or raw.get("state")
    key = _safe_str(raw).lower() if raw else None
    return SECTOR_STATUS_MAP.get(key, "normal")


def _parse_sector(cell: Any) -> dict | None:
    """Parse a CTD sector cell into {time, status} or None."""
    if cell is None or cell == "":
        return None
    if isinstance(cell, dict):
        t = _safe_str(cell.get("value") or cell.get("time"))
        status = _map_sector_status(cell.get("status") or cell.get("state"))
    elif isinstance(cell, list) and len(cell) >= 1:
        t = _safe_str(cell[0])
        status = _map_sector_status(cell[1] if len(cell) > 1 else None)
    else:
        t = _safe_str(cell)
        status = "normal"

    if not t or t in ("-", "--", "0", "0.000"):
        return None
    return {"time": t, "status": status}


def _get_col(row: list | dict, index: int, key: str = "", default: Any = None) -> Any:
    """Get value from row by index (list) or key (dict)."""
    if isinstance(row, list):
        try:
            return row[index]
        except IndexError:
            return default
    elif isinstance(row, dict):
        return row.get(key, row.get(str(index), default))
    return default


def _normalize_car(entry: Any, position: int) -> dict:
    """Normalize a single car entry from CTD to CarState dict."""
    row = entry if isinstance(entry, (list, dict)) else []

    number = _safe_str(_get_col(row, COL_NUMBER, "number", str(position)))
    driver = _safe_str(_get_col(row, COL_DRIVER, "driver", "Unknown"))
    team = _safe_str(_get_col(row, COL_TEAM, "team", "Unknown"))
    category = _map_category(_safe_str(_get_col(row, COL_CLASS, "class", "HYPERCAR")))

    pos = _safe_int(_get_col(row, COL_POS, "position", position))
    if pos == 0:
        pos = position

    gap_raw = _safe_str(_get_col(row, COL_GAP, "gap", "+0.000"))
    gap = gap_raw if gap_raw else "+0.000"

    interval_raw = _safe_str(_get_col(row, COL_INTERVAL, "interval", "+0.000"))
    interval = interval_raw if interval_raw else "+0.000"

    laps = _safe_int(_get_col(row, COL_LAPS, "laps", 0))
    last_lap = _safe_str(_get_col(row, COL_LAST_LAP, "lastLap", None)) or None
    best_lap = _safe_str(_get_col(row, COL_BEST_LAP, "bestLap", None)) or None

    pit_raw = _get_col(row, COL_PIT, "pit", False)
    in_pit = bool(pit_raw) if not isinstance(pit_raw, str) else pit_raw.lower() in ("1", "true", "pit", "p")

    track_progress_raw = _get_col(row, COL_TRACK_PROGRESS, "trackProgress", None)
    track_progress = _safe_float(track_progress_raw, 0.0)
    track_progress = max(0.0, min(1.0, track_progress))

    s1 = _parse_sector(_get_col(row, COL_S1, "s1", None))
    s2 = _parse_sector(_get_col(row, COL_S2, "s2", None))
    s3 = _parse_sector(_get_col(row, COL_S3, "s3", None))

    return {
        "number": number,
        "team": team,
        "category": category,
        "drivers": [driver],
        "currentDriver": driver if driver else None,
        "position": pos,
        "classPosition": pos,  # Will be recalculated below
        "gapToLeader": gap,
        "interval": interval,
        "trackProgress": track_progress,
        "sectors": {
            k: v for k, v in {"s1": s1, "s2": s2, "s3": s3}.items() if v is not None
        },
        "lastLap": last_lap,
        "bestLap": best_lap,
        "inPit": in_pit,
        "laps": laps,
    }


def _recalculate_class_positions(cars: list[dict]) -> list[dict]:
    """Assign classPosition within each category group."""
    class_counters: dict[str, int] = {}
    result = []
    for car in sorted(cars, key=lambda c: c["position"]):
        cat = car["category"]
        class_counters[cat] = class_counters.get(cat, 0) + 1
        result.append({**car, "classPosition": class_counters[cat]})
    return result


def normalize_ctd(raw: Any) -> dict:
    """
    Top-level normalizer.
    raw can be:
      - dict with keys 'cars', 'session', etc. (structured CTD)
      - list of car rows (bare timing table)
      - dict with 'S' (state snapshot) key
    """
    cars_raw = []
    session_raw = {}

    if isinstance(raw, dict):
        # Structured CTD — try common key patterns
        cars_raw = (
            raw.get("cars")
            or raw.get("entries")
            or raw.get("data")
            or raw.get("C")
            or []
        )
        session_raw = (
            raw.get("session")
            or raw.get("Session")
            or raw.get("S")
            or {}
        )
        if not isinstance(session_raw, dict):
            session_raw = {}
        # Sometimes CTD wraps everything under "state"
        if not cars_raw and "state" in raw:
            inner = raw["state"]
            if isinstance(inner, dict):
                cars_raw = inner.get("cars") or inner.get("C") or []
                session_raw = inner.get("session") or inner.get("S") or session_raw
    elif isinstance(raw, list):
        cars_raw = raw

    # Normalize cars
    cars = []
    for i, entry in enumerate(cars_raw, start=1):
        try:
            cars.append(_normalize_car(entry, i))
        except Exception:
            pass  # Skip malformed entries

    cars = _recalculate_class_positions(cars)

    # Session
    flag_raw = _safe_str(
        session_raw.get("flag") or session_raw.get("trackStatus") or "green"
    )
    flag = _map_flag(flag_raw)

    time_remaining = _safe_str(
        session_raw.get("timeRemaining")
        or session_raw.get("remaining")
        or "00:00:00"
    )
    elapsed = _safe_str(
        session_raw.get("elapsed")
        or session_raw.get("elapsedTime")
        or "00:00:00"
    )
    track_name = _safe_str(
        session_raw.get("trackName")
        or session_raw.get("name")
        or "Circuit de la Sarthe"
    )

    return {
        "session": {
            "flag": flag,
            "timeRemaining": time_remaining,
            "elapsed": elapsed,
            "trackName": track_name,
        },
        "cars": cars,
        "updatedAt": int(time.time() * 1000),
        "source": "bridge",
    }
