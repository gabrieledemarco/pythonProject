import useRaceStore from '../store/useRaceStore'

const SECTOR_STYLE = {
  best:     { background: '#9B59B6', color: '#fff' },
  improved: { background: '#3DDC84', color: '#000' },
  normal:   { background: '#FFB000', color: '#000' },
}

function SectorCell({ sector }) {
  if (!sector) return <td className="sector empty">—</td>
  const style = SECTOR_STYLE[sector.status] ?? {}
  return (
    <td className="sector" style={style}>
      {sector.time}
    </td>
  )
}

const CAT_COLORS = {
  HYPERCAR: '#FFD700',
  LMP2:     '#5BC8FF',
  LMGT3:    '#3DDC84',
}

export default function TimingTower() {
  const cars = useRaceStore((s) => s.raceState?.cars ?? [])
  const filter = useRaceStore((s) => s.categoryFilter)

  const visible = filter === 'ALL' ? cars : cars.filter((c) => c.category === filter)

  return (
    <div className="timing-tower">
      <div className="panel-title">TIMING TOWER</div>
      <div className="tower-scroll">
        <table className="tower-table">
          <thead>
            <tr>
              <th>P</th>
              <th>#</th>
              <th>Driver</th>
              <th>Cat</th>
              <th>Gap</th>
              <th>Int</th>
              <th>S1</th>
              <th>S2</th>
              <th>S3</th>
              <th>Last</th>
              <th>Best</th>
              <th>Pit</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((car) => (
              <tr key={car.number} className={car.inPit ? 'in-pit' : ''}>
                <td className="pos">{car.position}</td>
                <td className="carnum" style={{ color: CAT_COLORS[car.category] }}>
                  {car.number}
                </td>
                <td className="driver">{car.currentDriver ?? car.drivers[0]}</td>
                <td className="cat" style={{ color: CAT_COLORS[car.category] }}>
                  {car.category}
                </td>
                <td className="gap">{car.gapToLeader}</td>
                <td className="interval">{car.interval}</td>
                <SectorCell sector={car.sectors?.s1} />
                <SectorCell sector={car.sectors?.s2} />
                <SectorCell sector={car.sectors?.s3} />
                <td className="laptime">{car.lastLap ?? '—'}</td>
                <td className="laptime best-lap">{car.bestLap ?? '—'}</td>
                <td className="pit-flag">{car.inPit ? 'PIT' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
