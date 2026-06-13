import React, { useEffect, useState, useRef } from 'react'

// Le Mans circuit coordinates
const LAT = 47.9359
const LON = 0.2220

const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,precipitation,rain,windspeed_10m,winddirection_10m,relativehumidity_2m,surface_pressure&hourly=temperature_2m,precipitation_probability,precipitation&forecast_days=1&timezone=Europe%2FParis`

const REFRESH_MS = 5 * 60 * 1000 // 5 minutes

const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
function windDirection(deg) {
  return WIND_DIRS[Math.round(deg / 45) % 8]
}

// Mini track path for background decoration (same shape, scaled down)
const MINI_TRACK_PATH = `M 68,12 L 72,12 L 74,13 L 75,16 L 74.5,20 L 74,24 L 74.5,26 L 75,28 L 74.8,30 L 74,32 L 72,38 L 70,43 L 68,46 L 64,48 L 58,49 L 52,48.5 L 20,44 L 16,42 L 14,39 L 13,35 L 13.5,31 L 15,28 L 16,25 L 15.5,22 L 14,20 L 12,18 L 11,16 L 11.5,14 L 13,12 L 16,10.5 L 20,10 L 26,9.8 L 32,10 L 38,10.5 L 44,10.8 L 50,11 L 56,11.2 L 62,11.5 L 66,11.8 L 68,12 Z`

function PrecipBar({ hour, prob, current }) {
  const h = new Date()
  h.setHours(current + hour, 0, 0, 0)
  const label = h.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const height = Math.max(2, (prob / 100) * 48)
  const color = prob > 70 ? '#5BC8FF' : prob > 40 ? '#FFB000' : '#3DDC84'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
      <div style={{
        height: 48,
        width: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '60%',
          height,
          background: color,
          borderRadius: '2px 2px 0 0',
          opacity: 0.85,
        }} />
      </div>
      <span style={{ color: '#6B7280', fontSize: '0.55rem', fontFamily: 'monospace' }}>{label}</span>
      <span style={{ color, fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700 }}>{prob}%</span>
    </div>
  )
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  async function fetchWeather() {
    try {
      const res = await fetch(WEATHER_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWeather(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    intervalRef.current = setInterval(fetchWeather, REFRESH_MS)
    return () => clearInterval(intervalRef.current)
  }, [])

  const current = weather?.current
  const hourly = weather?.hourly

  // Get next 6 hours of precip probability
  const now = new Date()
  const currentHour = now.getHours()
  const times = hourly?.time || []
  const precipProbs = hourly?.precipitation_probability || []
  const next6 = []
  for (let i = 0; i < times.length && next6.length < 6; i++) {
    const t = new Date(times[i])
    if (t.getHours() >= currentHour) {
      next6.push({ hour: next6.length, time: t, prob: precipProbs[i] || 0 })
    }
  }

  return (
    <div style={{
      background: 'var(--color-bg)',
      border: '1px solid #2a2d35',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
      position: 'relative',
    }}>
      {/* Background mini track */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        opacity: 0.06,
        pointerEvents: 'none',
      }}>
        <svg viewBox="8 8 70 45" width={120} height={80}>
          <path d={MINI_TRACK_PATH} fill="none" stroke="#E8EAF0" strokeWidth={3} strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{
        padding: '0.5rem 0.75rem',
        background: 'var(--color-surface)',
        borderBottom: '1px solid #2a2d35',
        fontSize: '0.7rem',
        fontFamily: 'monospace',
        letterSpacing: '0.1em',
        color: 'var(--color-cyan)',
        fontWeight: 700,
        flexShrink: 0,
      }}>
        WEATHER — LE MANS
        {!loading && (
          <span style={{ color: 'var(--color-dim)', marginLeft: '0.5rem', fontWeight: 400 }}>
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
        {loading && (
          <div style={{ color: 'var(--color-dim)', fontFamily: 'monospace', fontSize: '0.75rem', textAlign: 'center', paddingTop: '1rem' }}>
            Fetching weather…
          </div>
        )}
        {error && (
          <div style={{ color: 'var(--color-red)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            Weather unavailable: {error}
          </div>
        )}
        {current && (
          <>
            {/* Temperature row */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-amber)', lineHeight: 1 }}>
                {Math.round(current.temperature_2m)}°C
              </span>
              <span style={{ color: 'var(--color-dim)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                Feels {Math.round(current.apparent_temperature)}°C
              </span>
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.4rem',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
            }}>
              {[
                { label: 'WIND', value: `${Math.round(current.windspeed_10m)} km/h ${windDirection(current.winddirection_10m)}`, color: 'var(--color-cyan)' },
                { label: 'RAIN', value: `${current.rain ?? current.precipitation ?? 0} mm`, color: '#5BC8FF' },
                { label: 'HUMIDITY', value: `${current.relativehumidity_2m}%`, color: 'var(--color-text)' },
                { label: 'PRESSURE', value: `${Math.round(current.surface_pressure)} hPa`, color: 'var(--color-text)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'var(--color-surface)',
                  borderRadius: 4,
                  padding: '0.3rem 0.5rem',
                  border: '1px solid #2a2d35',
                }}>
                  <div style={{ color: 'var(--color-dim)', fontSize: '0.6rem', marginBottom: 2 }}>{label}</div>
                  <div style={{ color, fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Precip forecast bars */}
            {next6.length > 0 && (
              <div>
                <div style={{
                  color: 'var(--color-dim)',
                  fontFamily: 'monospace',
                  fontSize: '0.62rem',
                  letterSpacing: '0.06em',
                  marginBottom: '0.4rem',
                }}>
                  PRECIP. PROBABILITY — NEXT 6H
                </div>
                <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'flex-end' }}>
                  {next6.map((item) => (
                    <PrecipBar
                      key={item.hour}
                      hour={item.hour}
                      prob={item.prob}
                      current={currentHour}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
