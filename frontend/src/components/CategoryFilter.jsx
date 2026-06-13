import React from 'react'
import useRaceStore from '../store/useRaceStore'

const CATEGORIES = ['ALL', 'HYPERCAR', 'LMP2', 'LMGT3']

const CAT_COLORS = {
  ALL: '#E8EAF0',
  HYPERCAR: '#FFD700',
  LMP2: '#5BC8FF',
  LMGT3: '#3DDC84',
}

export default function CategoryFilter() {
  const categoryFilter = useRaceStore((s) => s.categoryFilter)
  const setCategoryFilter = useRaceStore((s) => s.setCategoryFilter)

  return (
    <div style={{
      display: 'flex',
      gap: '0.4rem',
      padding: '0.4rem 1rem',
      background: 'var(--color-surface)',
      borderBottom: '1px solid #2a2d35',
      flexShrink: 0,
    }}>
      {CATEGORIES.map((cat) => {
        const isActive = categoryFilter === cat
        const color = CAT_COLORS[cat]
        return (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '0.2rem 0.8rem',
              borderRadius: 4,
              border: `1px solid ${isActive ? '#FFB000' : '#2a2d35'}`,
              background: isActive ? '#FFB000' : 'transparent',
              color: isActive ? '#0A0B0D' : color,
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
