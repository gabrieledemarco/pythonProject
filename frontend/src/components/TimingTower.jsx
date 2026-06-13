import React from 'react'
import useRaceStore from '../store/useRaceStore'

const SECTOR_STYLES = {
  best: { background: '#9B59B6', color: '#ffffff' },
  improved: { background: '#3DDC84', color: '#0A0B0D' },
  normal: { background: '#FFB000', color: '#0A0B0D' },
  undefined: { background: '#1e2027', color: '#6B7280' },
}

const CAT_BADGE = {
  HYPERCAR: { bg: '#2a2000', color: '#FFD700', label: 'HC' },
  LMP2: { bg: '#001a2a', color: '#5BC8FF', label: 'P2' },
  LMGT3: { bg: '#00221a', color: '#3DDC84', label: 'GT' },
}

function SectorCell({ sector }) {
  const style = sector ? SECTOR_STYLES[sector.status] || SECTOR_STYLES.undefined : SECTOR_STYLES.undefined
  return (
    <td style={{
      ...style,
      fontFamily: 'monospace',
      fontSize: '0.65rem',
      padding: '0 0.3rem',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      minWidth: '4.5rem',
    }}>
      {sector ? sector.time : '–'}
    </td>
  )
}

export default function TimingTower() {
  const raceState = useRaceStore((s) => s.raceState)
  const categoryFilter = useRaceStore((s) => s.categoryFilter)

  const allCars = raceState?.cars || []
  const cars = categoryFilter === 'ALL'
    ? allCars
    : allCars.filter((c) => c.category === categoryFilter)

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
        TIMING TOWER
        <span style={{ color: 'var(--color-dim)', marginLeft: '0.5rem', fontWeight: 400 }}>
          {cars.length} entries
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.7rem',
          fontFamily: 'monospace',
        }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#1a1d23' }}>
            <tr>
              {['POS', '#', 'DRIVER', 'TEAM', 'CAT', 'GAP', 'INT', 'S1', 'S2', 'S3', 'LAST', 'BEST', 'PIT'].map((h) => (
                <th key={h} style={{
                  padding: '0.35rem 0.4rem',
                  textAlign: h === 'POS' || h === '#' || h === 'CAT' || h === 'PIT' ? 'center' : 'left',
                  color: 'var(--color-dim)',
                  fontWeight: 600,
                  borderBottom: '1px solid #2a2d35',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.04em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cars.map((car, idx) => {
              const badge = CAT_BADGE[car.category] || CAT_BADGE.HYPERCAR
              const isEven = idx % 2 === 0
              return (
                <tr key={car.number} style={{
                  background: isEven ? 'var(--color-bg)' : '#0d0e11',
                  borderBottom: '1px solid #1a1d23',
                }}>
                  {/* Position */}
                  <td style={{ textAlign: 'center', padding: '0.3rem 0.4rem', color: 'var(--color-amber)', fontWeight: 700 }}>
                    {car.position}
                  </td>
                  {/* Car number */}
                  <td style={{ textAlign: 'center', padding: '0.3rem 0.4rem', fontWeight: 700, color: badge.color }}>
                    {car.number}
                  </td>
                  {/* Driver */}
                  <td style={{ padding: '0.3rem 0.4rem', color: 'var(--color-text)', whiteSpace: 'nowrap', maxWidth: '7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {car.currentDriver || car.drivers[0] || '–'}
                  </td>
                  {/* Team */}
                  <td style={{ padding: '0.3rem 0.4rem', color: 'var(--color-dim)', whiteSpace: 'nowrap', maxWidth: '8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {car.team}
                  </td>
                  {/* Category */}
                  <td style={{ textAlign: 'center', padding: '0.3rem 0.3rem' }}>
                    <span style={{
                      background: badge.bg,
                      color: badge.color,
                      padding: '0.1rem 0.3rem',
                      borderRadius: 3,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                    }}>
                      {badge.label}
                    </span>
                  </td>
                  {/* Gap */}
                  <td style={{ padding: '0.3rem 0.4rem', color: 'var(--color-text)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {car.gapToLeader}
                  </td>
                  {/* Interval */}
                  <td style={{ padding: '0.3rem 0.4rem', color: 'var(--color-cyan)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {car.interval}
                  </td>
                  {/* Sectors */}
                  <SectorCell sector={car.sectors?.s1} />
                  <SectorCell sector={car.sectors?.s2} />
                  <SectorCell sector={car.sectors?.s3} />
                  {/* Last lap */}
                  <td style={{ padding: '0.3rem 0.4rem', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                    {car.lastLap || '–'}
                  </td>
                  {/* Best lap */}
                  <td style={{ padding: '0.3rem 0.4rem', color: '#9B59B6', whiteSpace: 'nowrap' }}>
                    {car.bestLap || '–'}
                  </td>
                  {/* Pit */}
                  <td style={{ textAlign: 'center', padding: '0.3rem 0.3rem' }}>
                    {car.inPit && (
                      <span style={{
                        background: '#3a0a0a',
                        color: '#FF4D4D',
                        padding: '0.1rem 0.3rem',
                        borderRadius: 3,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                      }}>
                        PIT
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {cars.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-dim)', fontFamily: 'monospace' }}>
            No timing data available
          </div>
        )}
      </div>
    </div>
  )
}
