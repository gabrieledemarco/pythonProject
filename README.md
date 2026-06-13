# Pit Wall — Le Mans 24h Multiscreen Companion

A real-time multiscreen companion app for the Le Mans 24 Hours race. Displays live timing data, track map, onboard cameras, and weather in a dense pit-wall style layout.

## Screenshots

Four-panel dashboard:
- **Track Map** — SVG Circuit de la Sarthe with live car positions
- **Timing Tower** — Full timing table with sector colors, gaps, and stint info
- **Onboard Panel** — 5 simultaneous YouTube onboard camera feeds
- **Weather Widget** — Le Mans weather via Open-Meteo with precipitation forecast

## Prerequisites

- **Node.js** 18 or later — https://nodejs.org/
- **Python** 3.11 or later — https://www.python.org/downloads/
- npm (bundled with Node.js)
- pip (bundled with Python)

## Quick Start — Simulation Mode (no live race required)

### Frontend

```bat
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser. The app runs in simulation mode by default, animating cars around the track using fixture data.

### Environment variables

Copy `.env.example` to `.env` and edit as needed:

```
VITE_DATA_SOURCE=sim          # 'sim' or 'bridge'
VITE_BRIDGE_WS=ws://localhost:8771
```

## Bridge (Live Timing — Race Weekend Only)

The Python bridge connects to [Timing71](https://www.timing71.org/) and relays live WEC/Le Mans timing data over a local WebSocket.

### Setup

```bat
cd bridge
pip install -r requirements.txt
python main.py
```

### Options

```
python main.py --config config.yaml   # use custom config file
python main.py --port 8771            # override WS port
python main.py --dump                 # log raw CTD data to file for debugging
```

### Switch frontend to live mode

In `frontend/.env`:

```
VITE_DATA_SOURCE=bridge
VITE_BRIDGE_WS=ws://localhost:8771
```

Then restart the dev server.

## Windows-specific notes

- Use **PowerShell** or **Windows Terminal** — avoid CMD for npm scripts
- Python: ensure `python` is on your PATH (check "Add to PATH" during install)
- If `npm run dev` fails with EACCES, run terminal as Administrator once to install

## Architecture

```
Browser (React + Vite)
    |
    +- sim mode: simAdapter.js (built-in fixture + animation)
    |
    +- bridge mode: WebSocket -> Python bridge (ws://localhost:8771)
                         |
                         +- autobahn WAMP -> Timing71 relay
                                               |
                                               +- ACO / Al Kamel timing feed
```

## Project Structure

```
frontend/          React + Vite app
  src/
    components/    UI components
    store/         Zustand global state
    data/          Types, fixture, sim adapter
    hooks/         useDataSource hook
bridge/            Python WebSocket bridge
  src/
    timing71_client.py   WAMP client
    normalizer.py        CTD -> RaceState mapping
    server.py            aiohttp WebSocket server
```

## Legal Notice

Timing data provided via [Timing71](https://www.timing71.org/) · Raw timing data is the property of the Automobile Club de l'Ouest (ACO) and Al Kamel Systems · This application is intended for **personal use only** and must not be used for commercial purposes · YouTube embeds subject to YouTube Terms of Service.

Weather data from [Open-Meteo](https://open-meteo.com/) (free, no API key required).
