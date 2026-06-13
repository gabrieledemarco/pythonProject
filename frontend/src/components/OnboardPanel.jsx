import React, { useState } from 'react'
import onboardsConfig from '../../onboards.config.json'

const CAT_COLOR = {
  HYPERCAR: '#FFD700',
  LMP2: '#5BC8FF',
  LMGT3: '#3DDC84',
}

function YoutubeSlot({ slot, config, large, onSelect }) {
  const selected = config.find((c) => c.id === slot) || config[0]

  return (
    <div style={{
      background: '#0d0e11',
      border: '1px solid #2a2d35',
      borderRadius: 6,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      gridRow: large ? 'span 2' : 'auto',
    }}>
      {/* Slot header with dropdown */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.5rem',
        background: 'var(--color-surface)',
        borderBottom: '1px solid #2a2d35',
        flexShrink: 0,
      }}>
        <span style={{
          color: CAT_COLOR[selected?.category] || '#E8EAF0',
          fontFamily: 'monospace',
          fontSize: '0.65rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {selected?.label || 'Select feed'}
        </span>
        <select
          value={slot}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            marginLeft: 'auto',
            background: '#1a1d23',
            color: '#E8EAF0',
            border: '1px solid #2a2d35',
            borderRadius: 3,
            fontSize: '0.6rem',
            fontFamily: 'monospace',
            padding: '0.1rem 0.3rem',
            cursor: 'pointer',
          }}
        >
          {config.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      {/* Embed */}
      <div style={{ flex: 1, position: 'relative', minHeight: large ? 160 : 80 }}>
        {selected?.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${selected.youtubeId}?autoplay=0&mute=1&modestbranding=1&rel=0`}
            title={selected.label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-dim)',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
          }}>
            No feed selected
          </div>
        )}
      </div>
    </div>
  )
}

export default function OnboardPanel() {
  // Initialize with first 5 config entries
  const defaultIds = onboardsConfig.slice(0, 5).map((c) => c.id)
  const [slots, setSlots] = useState(defaultIds)

  function setSlot(index, id) {
    setSlots((prev) => {
      const next = [...prev]
      next[index] = id
      return next
    })
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
    }}>
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
        ONBOARDS
        <span style={{ color: 'var(--color-dim)', marginLeft: '0.5rem', fontWeight: 400 }}>
          5 channels
        </span>
      </div>
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '2fr 1fr 1fr',
        gap: '0.3rem',
        padding: '0.3rem',
        overflow: 'hidden',
      }}>
        {/* Slot 0: large (spans 2 rows) */}
        <YoutubeSlot
          slot={slots[0]}
          config={onboardsConfig}
          large={true}
          onSelect={(id) => setSlot(0, id)}
        />
        {/* Slots 1-4: small */}
        {[1, 2, 3, 4].map((i) => (
          <YoutubeSlot
            key={i}
            slot={slots[i] || onboardsConfig[i]?.id}
            config={onboardsConfig}
            large={false}
            onSelect={(id) => setSlot(i, id)}
          />
        ))}
      </div>
    </div>
  )
}
