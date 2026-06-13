import useRaceStore from '../store/useRaceStore'

const FLAG_COLORS = {
  green: '#3DDC84',
  yellow: '#FFB000',
  red: '#FF4D4D',
  sc: '#FFB000',
  fcy: '#FFB000',
  chequered: '#ffffff',
}

const STATUS_STYLES = {
  live:         { background: '#3DDC84', color: '#000' },
  sim:          { background: '#5BC8FF', color: '#000' },
  reconnecting: { background: '#FFB000', color: '#000' },
  disconnected: { background: '#FF4D4D', color: '#fff' },
}

export default function StatusBar() {
  const session = useRaceStore((s) => s.raceState?.session)
  const status = useRaceStore((s) => s.connectionStatus)

  const flagColor = session ? FLAG_COLORS[session.flag] ?? '#fff' : '#333'
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.disconnected
  const statusLabel = status?.toUpperCase() ?? 'DISCONNECTED'

  return (
    <div className="status-bar">
      <span className="status-track">{session?.trackName ?? 'Pit Wall'}</span>

      <span className="status-flag" style={{ color: flagColor }}>
        ⬤ {session?.flag?.toUpperCase() ?? '—'}
      </span>

      <span className="status-time">
        {session?.timeRemaining ? `⏱ ${session.timeRemaining}` : ''}
      </span>

      <span className="status-pill" style={statusStyle}>
        {statusLabel}
      </span>
    </div>
  )
}
