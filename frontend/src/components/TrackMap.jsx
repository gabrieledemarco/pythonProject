import { useEffect, useRef, useState } from 'react'
import useRaceStore from '../store/useRaceStore'

// Simplified Circuit de la Sarthe path (viewBox 0 0 800 500)
// Key landmarks: start/finish straight, Dunlop, Tertre Rouge, Mulsanne,
// Mulsanne corner, Indianapolis, Arnage, Porsche curves, Ford chicanes
const TRACK_PATH =
  'M 400 460 ' +
  'L 580 460 L 610 450 L 630 430 L 635 400 ' + // start/finish to Dunlop
  'L 630 360 L 620 340 L 600 330 ' +            // Dunlop curves
  'L 560 325 L 520 320 ' +                       // towards Tertre Rouge
  'L 490 310 L 475 290 L 470 260 ' +            // Tertre Rouge
  'L 468 200 L 466 140 L 464 80 ' +             // Mulsanne straight begin
  'L 462 50 L 450 30 L 430 20 ' +               // Mulsanne corner approach
  'L 400 18 L 370 22 L 350 38 ' +               // Mulsanne corner
  'L 340 60 L 338 100 L 336 140 ' +             // post-Mulsanne
  'L 330 170 L 320 185 L 300 190 ' +            // Indianapolis entry
  'L 270 192 L 250 198 L 235 215 ' +            // Indianapolis
  'L 228 235 L 224 255 L 222 275 ' +            // Arnage approach
  'L 220 300 L 218 320 L 215 340 ' +            // Arnage
  'L 220 360 L 235 375 L 258 382 ' +            // post-Arnage
  'L 285 385 L 310 382 L 330 372 ' +            // Porsche curves
  'L 345 360 L 352 345 L 355 328 ' +            // Ford chicane 1
  'L 358 310 L 365 295 L 375 285 ' +            // Ford chicane 2
  'L 385 278 L 395 274 L 400 270 ' +            // towards start/finish
  'L 400 350 L 400 460 Z'                        // back straight to S/F

const CAT_COLORS = {
  HYPERCAR: '#FFD700',
  LMP2:     '#5BC8FF',
  LMGT3:    '#3DDC84',
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function TrackMap() {
  const cars = useRaceStore((s) => s.raceState?.cars ?? [])
  const filter = useRaceStore((s) => s.categoryFilter)
  const pathRef = useRef(null)
  const [positions, setPositions] = useState({})
  const [tooltip, setTooltip] = useState(null)
  const targetRef = useRef({})
  const currentRef = useRef({})
  const rafRef = useRef(null)
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const visible = filter === 'ALL' ? cars : cars.filter((c) => c.category === filter)

  // Update targets when raceState changes
  useEffect(() => {
    visible.forEach((car) => {
      targetRef.current[car.number] = car.trackProgress
    })
  }, [cars, filter])

  // Animation loop
  useEffect(() => {
    if (reducedMotion) {
      const snap = {}
      visible.forEach((c) => { snap[c.number] = c.trackProgress })
      setPositions(snap)
      return
    }

    function animate() {
      let changed = false
      const next = { ...currentRef.current }
      Object.keys(targetRef.current).forEach((num) => {
        const target = targetRef.current[num]
        const current = next[num] ?? target
        const delta = lerp(current, target, 0.12)
        if (Math.abs(delta - current) > 0.0001) changed = true
        next[num] = delta
      })
      if (changed) {
        currentRef.current = next
        setPositions({ ...next })
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [reducedMotion])

  function getXY(progress) {
    const path = pathRef.current
    if (!path) return { x: 0, y: 0 }
    const totalLen = path.getTotalLength()
    const pt = path.getPointAtLength(progress * totalLen)
    return { x: pt.x, y: pt.y }
  }

  return (
    <div className="track-map">
      <div className="panel-title">TRACK MAP</div>
      <svg
        className="track-svg"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Track outline */}
        <path
          ref={pathRef}
          d={TRACK_PATH}
          fill="none"
          stroke="#2a2d33"
          strokeWidth="8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Track centerline */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke="#3a3d45"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="8 6"
        />

        {/* Car dots */}
        {visible.map((car) => {
          const prog = positions[car.number] ?? car.trackProgress
          const { x, y } = getXY(prog)
          const color = CAT_COLORS[car.category]
          return (
            <g
              key={car.number}
              transform={`translate(${x},${y})`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ car, x, y })}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle r={car.inPit ? 4 : 7} fill={color} opacity={car.inPit ? 0.4 : 1} />
              <text
                textAnchor="middle"
                dy="-10"
                fontSize="9"
                fill={color}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {car.number}
              </text>
            </g>
          )
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const { car, x, y } = tooltip
          const tx = Math.min(x + 12, 730)
          const ty = Math.max(y - 50, 10)
          return (
            <g>
              <rect x={tx} y={ty} width={140} height={52} rx={4}
                fill="#16181C" stroke="#FFB000" strokeWidth={1} />
              <text x={tx + 8} y={ty + 15} fontSize={10} fill="#FFB000" fontFamily="monospace">
                #{car.number} P{car.position}
              </text>
              <text x={tx + 8} y={ty + 28} fontSize={9} fill="#ccc" fontFamily="monospace">
                {car.currentDriver ?? car.drivers[0]}
              </text>
              <text x={tx + 8} y={ty + 42} fontSize={9} fill="#888" fontFamily="monospace">
                Last: {car.lastLap ?? '—'}
              </text>
            </g>
          )
        })()}

        {/* Start/finish line */}
        <line x1="400" y1="452" x2="400" y2="468" stroke="#fff" strokeWidth="2" />
        <text x="404" y="466" fontSize="8" fill="#888" fontFamily="monospace">S/F</text>
      </svg>
    </div>
  )
}
