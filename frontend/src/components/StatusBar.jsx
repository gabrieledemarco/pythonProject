import React from 'react'
import useRaceStore from '../store/useRaceStore'

const FLAG_COLORS = {
  green: '#3DDC84',
  yellow: '#FFB000',
  red: '#FF4D4D',
  sc: '#FFB000',
  fcy: '#FFB000',
  chequered: '#E8EAF0',
}

const FLAG_LABELS = {
  green: 'GREEN',
  yellow: 'YELLOW',
  red: 'RED',
  sc: 'SAFETY CAR',
  fcy: 'FCY',
  chequered: 'CHEQUERED',
}

const STATUS_PILL = {
  live: { bg: '#1a3a1a', color: '#3DDC84', label: 'LIVE' },
  sim: { bg: '#1a2a3a', color: '#5BC8FF', label: 'SIM' },
  reconnecting: { bg: '#3a2a00', color: '#FFB000', label: 'RECONNECTING' },
  disconnected: { bg: '#3a0a0a', color: '#FF4D4D', label: 'DISCONNECTED' },
}

export default function StatusBar() {
  const raceState = useRaceStore((s) => s.raceState)
  const connectionStatus = useRaceStore((s) => s.connectionStatus)

  const session = raceState?.session
  const flag = session?.flag || 'green'
  const pill = STATUS_PILL[connectionStatus] || STATUS_PILL.sim

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem',
      padding: '0.5rem 1rem',
      background: 'var(--color-surface)',
      borderBottom: '1px solid #2a2d35',
      fontFamily: 'monospace',
      fontSize: '0.75rem',
      letterSpacing: '0.05em',
      flexShrink: 0,
    }}>
      {/* Track name */}
      <span style={{ color: 'var(--color-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
        {session?.trackName || 'Circuit de la Sarthe'}
      </span>

      {/* Flag */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: FLAG_COLORS[flag] || '#E8EAF0',
        fontWeight: 700,
      }}>
        <span style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: FLAG_COLORS[flag] || '#E8EAF0',
          display: 'inline-block',
          boxShadow: `0 0 6px ${FLAG_COLORS[flag] || '#E8EAF0'}`,
        }} />
        {FLAG_LABELS[flag] || flag.toUpperCase()}
      </span>

      {/* Times */}
      <span style={{ color: 'var(--color-dim)' }}>
        Elapsed: <span style={{ color: 'var(--color-text)' }}>{session?.elapsed || '--:--:--'}</span>
      </span>
      <span style={{ color: 'var(--color-dim)' }}>
        Remaining: <span style={{ color: 'var(--color-amber)', fontWeight: 700 }}>{session?.timeRemaining || '--:--:--'}</span>
      </span>

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Connection pill */}
      <span style={{
        padding: '0.2rem 0.6rem',
        borderRadius: 4,
        background: pill.bg,
        color: pill.color,
        fontWeight: 700,
        border: `1px solid ${pill.color}33`,
        letterSpacing: '0.1em',
      }}>
        {pill.label}
      </span>
    </div>
  )
}
