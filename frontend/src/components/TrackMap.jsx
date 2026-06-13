import React, { useRef, useEffect, useState, useCallback } from 'react'
import useRaceStore from '../store/useRaceStore'

// Simplified Circuit de la Sarthe path (normalized to ~800x500 viewBox)
// Start/finish is at approximately (680, 120)
// Going clockwise: SF straight → Ford chicanes → Mulsanne → Indianapolis → Porsche curves → back
const TRACK_PATH = `
  M 680,120
  L 720,120 L 740,130 L 750,160 L 745,200
  L 740,240 L 745,260 L 750,280
  L 748,300 L 740,320
  L 720,380 L 700,430 L 680,460
  L 640,480 L 580,490 L 520,485
  L 200,440 L 160,420 L 140,390
  L 130,350 L 135,310 L 150,280
  L 160,250 L 155,220 L 140,200
  L 120,180 L 110,160 L 115,140
  L 130,120 L 160,105 L 200,100
  L 260,98 L 320,100 L 380,105
  L 440,108 L 500,110 L 560,112
  L 620,115 L 660,118 L 680,120
  Z
`

// Car category colors
const CAT_COLORS = {
  HYPERCAR: '#FFD700',
  LMP2: '#5BC8FF',
  LMGT3: '#3DDC84',
}

function CarDot({ car, pathLength, pathRef }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const animRef = useRef(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!pathRef.current || pathLength === 0) return
    const len = car.trackProgress * pathLength
    const pt = pathRef.current.getPointAtLength(len)
    targetRef.current = { x: pt.x, y: pt.y }

    if (prefersReducedMotion) {
      setPos({ x: pt.x, y: pt.y })
      currentRef.current = { x: pt.x, y: pt.y }
      return
    }

    function lerp(a, b, t) { return a + (b - a) * t }

    function animate() {
      currentRef.current = {
        x: lerp(currentRef.current.x, targetRef.current.x, 0.12),
        y: lerp(currentRef.current.y, targetRef.current.y, 0.12),
      }
      setPos({ ...currentRef.current })
      animRef.current = requestAnimationFrame(animate)
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [car.trackProgress, pathLength])

  if (pos.x === 0 && pos.y === 0) return null

  const color = CAT_COLORS[car.category] || '#E8EAF0'

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={pos.x}
        cy={pos.y}
        r={car.inPit ? 4 : 6}
        fill={color}
        opacity={car.inPit ? 0.4 : 1}
        stroke="#0A0B0D"
        strokeWidth={1.5}
        style={{ filter: car.inPit ? 'none' : `drop-shadow(0 0 4px ${color})` }}
      />
      {/* Car number */}
      <text
        x={pos.x}
        y={pos.y - 10}
        textAnchor="middle"
        fill={color}
        fontSize="8"
        fontFamily="monospace"
        fontWeight="700"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        #{car.number}
      </text>
      {/* Tooltip */}
      {hovered && (
        <g>
          <rect
            x={pos.x + 8}
            y={pos.y - 30}
            width={130}
            height={50}
            rx={4}
            fill="#16181C"
            stroke="#2a2d35"
            strokeWidth={1}
          />
          <text x={pos.x + 14} y={pos.y - 14} fill="#E8EAF0" fontSize="9" fontFamily="monospace">
            P{car.position} #{car.number} {car.currentDriver || car.drivers[0] || ''}
          </text>
          <text x={pos.x + 14} y={pos.y - 3} fill="#6B7280" fontSize="8" fontFamily="monospace">
            {car.team}
          </text>
          <text x={pos.x + 14} y={pos.y + 8} fill="#FFB000" fontSize="8" fontFamily="monospace">
            Last: {car.lastLap || '--'}
          </text>
        </g>
      )}
    </g>
  )
}

export default function TrackMap() {
  const raceState = useRaceStore((s) => s.raceState)
  const categoryFilter = useRaceStore((s) => s.categoryFilter)
  const pathRef = useRef(null)
  const [pathLength, setPathLength] = useState(0)

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength())
    }
  }, [])

  const cars = raceState?.cars || []
  const filteredCars = categoryFilter === 'ALL'
    ? cars
    : cars.filter((c) => c.category === categoryFilter)

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
      }}>
        TRACK MAP — CIRCUIT DE LA SARTHE
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
        <svg
          viewBox="80 90 700 420"
          style={{ width: '100%', height: '100%', maxHeight: 400 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Track outline (wider stroke = tarmac) */}
          <path
            d={TRACK_PATH}
            fill="none"
            stroke="#2a2d35"
            strokeWidth={18}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Track surface */}
          <path
            ref={pathRef}
            d={TRACK_PATH}
            fill="none"
            stroke="#3a3d45"
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Start/finish line */}
          <line x1="680" y1="108" x2="680" y2="132" stroke="#E8EAF0" strokeWidth={3} />

          {/* Track labels */}
          <text x="730" y="200" fill="#6B7280" fontSize="9" fontFamily="monospace">Mulsanne</text>
          <text x="730" y="212" fill="#6B7280" fontSize="9" fontFamily="monospace">Straight</text>
          <text x="120" y="175" fill="#6B7280" fontSize="9" fontFamily="monospace">Indianapolis</text>
          <text x="130" y="280" fill="#6B7280" fontSize="9" fontFamily="monospace">Porsche</text>
          <text x="130" y="292" fill="#6B7280" fontSize="9" fontFamily="monospace">Curves</text>
          <text x="630" y="112" fill="#E8EAF0" fontSize="9" fontFamily="monospace">S/F</text>

          {/* Car dots */}
          {filteredCars.map((car) => (
            <CarDot
              key={car.number}
              car={car}
              pathLength={pathLength}
              pathRef={pathRef}
            />
          ))}
        </svg>
      </div>
      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        padding: '0.4rem 0.75rem',
        borderTop: '1px solid #2a2d35',
        fontSize: '0.65rem',
        fontFamily: 'monospace',
      }}>
        {Object.entries(CAT_COLORS).map(([cat, color]) => (
          <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {cat}
          </span>
        ))}
        <span style={{ color: 'var(--color-dim)', marginLeft: 'auto' }}>
          {filteredCars.length} cars on track
        </span>
      </div>
    </div>
  )
}
