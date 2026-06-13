import { useEffect, useState } from 'react'

const LAT = 47.9359
const LON = 0.2220
const REFRESH_MS = 5 * 60 * 1000

const TRACK_PATH_MINI =
  'M 200 230 L 290 230 L 305 225 L 315 215 L 317 200 ' +
  'L 315 180 L 310 170 L 300 165 L 280 163 L 260 160 ' +
  'L 245 155 L 237 145 L 235 130 L 234 70 L 232 40 ' +
  'L 231 25 L 225 15 L 215 10 L 200 9 L 185 11 ' +
  'L 175 19 L 170 30 L 168 50 L 166 85 ' +
  'L 165 100 L 160 110 L 150 115 ' +
  'L 135 116 L 125 119 L 117 128 ' +
  'L 114 140 L 112 155 L 111 170 ' +
  'L 112 183 L 118 192 L 129 196 ' +
  'L 143 197 L 155 194 L 165 188 ' +
  'L 173 182 L 176 173 L 176 163 ' +
  'L 179 155 L 183 147 L 188 142 ' +
  'L 193 139 L 200 137 L 200 180 L 200 230 Z'

function WindArrow({ deg }) {
  const rad = (deg * Math.PI) / 180
  const x2 = 12 + Math.sin(rad) * 10
  const y2 = 12 - Math.cos(rad) * 10
  return (
    <svg width="24" height="24" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="#333" strokeWidth="1" />
      <line x1="12" y1="12" x2={x2} y2={y2} stroke="#FFB000" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PrecipBar({ values }) {
  if (!values || values.length === 0) return null
  return (
    <div className="precip-bars">
      {values.map((v, i) => (
        <div key={i} className="precip-col">
          <div
            className="precip-fill"
            style={{ height: `${v}%`, background: v > 50 ? '#5BC8FF' : '#2a4a6a' }}
          />
          <span className="precip-label">{v}%</span>
          <span className="precip-hour">+{i + 1}h</span>
        </div>
      ))}
    </div>
  )
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [precip, setPrecip] = useState([])
  const [error, setError] = useState(null)

  async function fetchWeather() {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LAT}&longitude=${LON}` +
        `&current=temperature_2m,apparent_temperature,precipitation,rain,` +
        `windspeed_10m,winddirection_10m,relativehumidity_2m,surface_pressure` +
        `&hourly=precipitation_probability` +
        `&forecast_days=1&timezone=Europe%2FParis`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWeather(data.current)

      // next 6 hours precipitation probability
      const now = new Date()
      const currentHour = now.getHours()
      const times = data.hourly.time ?? []
      const probs = data.hourly.precipitation_probability ?? []
      const next6 = []
      for (let i = 0; i < times.length && next6.length < 6; i++) {
        const h = new Date(times[i]).getHours()
        if (h > currentHour) next6.push(probs[i] ?? 0)
      }
      setPrecip(next6)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    fetchWeather()
    const id = setInterval(fetchWeather, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="weather-widget">
      <div className="panel-title">WEATHER · Circuit de la Sarthe</div>

      <div className="weather-body">
        <div className="weather-main">
          {error && <div className="weather-error">⚠ {error}</div>}
          {!weather && !error && <div className="weather-loading">Loading…</div>}
          {weather && (
            <div className="weather-grid">
              <div className="wx-item">
                <span className="wx-label">AIR TEMP</span>
                <span className="wx-value">{weather.temperature_2m}°C</span>
              </div>
              <div className="wx-item">
                <span className="wx-label">FEELS LIKE</span>
                <span className="wx-value">{weather.apparent_temperature}°C</span>
              </div>
              <div className="wx-item">
                <span className="wx-label">RAIN</span>
                <span className="wx-value">{weather.rain ?? weather.precipitation} mm</span>
              </div>
              <div className="wx-item">
                <span className="wx-label">WIND</span>
                <span className="wx-value">
                  <WindArrow deg={weather.winddirection_10m} />
                  {weather.windspeed_10m} km/h
                </span>
              </div>
              <div className="wx-item">
                <span className="wx-label">HUMIDITY</span>
                <span className="wx-value">{weather.relativehumidity_2m}%</span>
              </div>
              <div className="wx-item">
                <span className="wx-label">PRESSURE</span>
                <span className="wx-value">{weather.surface_pressure} hPa</span>
              </div>
            </div>
          )}

          <div className="wx-forecast-label">PRECIP. FORECAST</div>
          <PrecipBar values={precip} />
        </div>

        <div className="weather-map">
          <svg viewBox="0 0 400 250" width="100%" height="100%">
            <path
              d={TRACK_PATH_MINI}
              fill="none"
              stroke="#1e2228"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d={TRACK_PATH_MINI}
              fill="none"
              stroke="#2a3040"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <text x="196" y="245" fontSize="8" fill="#444" fontFamily="monospace" textAnchor="middle">
              Circuit de la Sarthe · 13.626 km
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}
