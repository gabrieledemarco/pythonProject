"""
Maps raw Timing71 CTD (Common Timing Data) to the internal RaceState schema.
CTD format is partially documented; fields are reverse-engineered from relay dumps.
"""
import time


def _safe(val, default="—"):
    return val if val is not None else default


def _sector_status(time_val, best_val, prev_val):
    """Determine sector status from CTD numeric values."""
    if time_val is None:
        return None
    try:
        t = float(time_val)
        b = float(best_val) if best_val else None
        p = float(prev_val) if prev_val else None
        if b is not None and t <= b:
            return "best"
        if p is not None and t < p:
            return "improved"
        return "normal"
    except (TypeError, ValueError):
        return "normal"


def _format_time(seconds):
    """Convert float seconds to 'm:ss.SSS' string."""
    if seconds is None:
        return None
    try:
        s = float(seconds)
        mins = int(s // 60)
        secs = s - mins * 60
        return f"{mins}:{secs:06.3f}"
    except (TypeError, ValueError):
        return str(seconds)


def _format_sector(seconds):
    """Convert float seconds to 'ss.S' string for sector display."""
    if seconds is None:
        return None
    try:
        return f"{float(seconds):.1f}"
    except (TypeError, ValueError):
        return str(seconds)


def _gap_string(value):
    if value is None:
        return "—"
    if isinstance(value, str):
        return value
    try:
        f = float(value)
        if f < 0:
            return "—"
        if f == 0:
            return "+0.000"
        return f"+{f:.3f}"
    except (TypeError, ValueError):
        return str(value)


# Timing71 category codes to internal names
CATEGORY_MAP = {
    "H": "HYPERCAR",
    "HYPERCAR": "HYPERCAR",
    "LMP2": "LMP2",
    "L": "LMP2",
    "GT3": "LMGT3",
    "LMGT3": "LMGT3",
    "G": "LMGT3",
}

FLAG_MAP = {
    "green": "green",
    "yellow": "yellow",
    "red": "red",
    "sc": "sc",
    "safety car": "sc",
    "fcy": "fcy",
    "full course yellow": "fcy",
    "chequered": "chequered",
    "finish": "chequered",
}


def normalize_ctd(raw: dict) -> dict:
    """
    Transform a raw CTD state dict into the internal RaceState schema.
    raw is the full message received from Timing71 STATE_PUBLISH.
    """
    cars_raw = raw.get("cars", raw.get("entries", []))
    session_raw = raw.get("session", raw.get("state", {}))

    flag_raw = str(session_raw.get("flag", session_raw.get("trackStatus", "green"))).lower()
    flag = FLAG_MAP.get(flag_raw, "green")

    time_remaining = _safe(session_raw.get("timeRemaining", session_raw.get("remainingTime")), "—")
    elapsed = _safe(session_raw.get("elapsed", session_raw.get("elapsedTime")), "—")

    cars = []
    for entry in cars_raw:
        num = str(_safe(entry.get("number", entry.get("num", "?"))))
        team = _safe(entry.get("team", entry.get("teamName", "Unknown")))

        cat_raw = str(entry.get("category", entry.get("class", ""))).upper()
        category = CATEGORY_MAP.get(cat_raw, "HYPERCAR")

        drivers_raw = entry.get("drivers", entry.get("driver", []))
        if isinstance(drivers_raw, str):
            drivers = [drivers_raw]
        elif isinstance(drivers_raw, list):
            drivers = [
                d.get("name", d) if isinstance(d, dict) else str(d)
                for d in drivers_raw
            ]
        else:
            drivers = ["Unknown"]

        current_driver = entry.get("currentDriver", drivers[0] if drivers else None)

        position = int(entry.get("position", entry.get("pos", 0)) or 0)
        class_position = int(entry.get("classPosition", entry.get("classPos", 0)) or 0)

        gap = _gap_string(entry.get("gap", entry.get("gapToLeader")))
        interval = _gap_string(entry.get("interval", entry.get("int")))

        track_progress = float(entry.get("trackProgress", entry.get("progress", 0.0)) or 0.0)

        # Sector handling: CTD may use s1Time/s2Time/s3Time or sectors array
        sectors = {}
        for si, key_time, key_best, key_prev in [
            ("s1", "s1Time", "s1Best", "s1Prev"),
            ("s2", "s2Time", "s2Best", "s2Prev"),
            ("s3", "s3Time", "s3Best", "s3Prev"),
        ]:
            t = entry.get(key_time)
            b = entry.get(key_best)
            p = entry.get(key_prev)
            if t is not None:
                status = _sector_status(t, b, p)
                sectors[si] = {"time": _format_sector(t), "status": status}

        # Fallback: sectors as list
        if not sectors:
            raw_sectors = entry.get("sectors", [])
            for i, sec in enumerate(raw_sectors[:3]):
                key = f"s{i+1}"
                if isinstance(sec, dict):
                    t = sec.get("time")
                    b = sec.get("best")
                    p = sec.get("prev")
                    if t is not None:
                        sectors[key] = {
                            "time": _format_sector(t),
                            "status": _sector_status(t, b, p),
                        }

        last_lap_raw = entry.get("lastLap", entry.get("lastLapTime"))
        best_lap_raw = entry.get("bestLap", entry.get("bestLapTime"))

        in_pit = bool(entry.get("inPit", entry.get("pit", False)))
        laps = int(entry.get("laps", entry.get("lap", 0)) or 0)

        cars.append({
            "number": num,
            "team": team,
            "category": category,
            "drivers": drivers,
            "currentDriver": current_driver,
            "position": position,
            "classPosition": class_position,
            "gapToLeader": gap,
            "interval": interval,
            "trackProgress": track_progress,
            "sectors": sectors,
            "lastLap": _format_time(last_lap_raw) if last_lap_raw else None,
            "bestLap": _format_time(best_lap_raw) if best_lap_raw else None,
            "inPit": in_pit,
            "laps": laps,
        })

    cars.sort(key=lambda c: c["position"] if c["position"] > 0 else 9999)

    return {
        "session": {
            "flag": flag,
            "timeRemaining": time_remaining,
            "elapsed": elapsed,
            "trackName": "Circuit de la Sarthe",
        },
        "cars": cars,
        "updatedAt": int(time.time() * 1000),
        "source": "bridge",
    }
