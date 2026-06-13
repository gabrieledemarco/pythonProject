import { useDataSource } from './hooks/useDataSource'
import StatusBar from './components/StatusBar'
import CategoryFilter from './components/CategoryFilter'
import TrackMap from './components/TrackMap'
import TimingTower from './components/TimingTower'
import OnboardPanel from './components/OnboardPanel'
import WeatherWidget from './components/WeatherWidget'

export default function App() {
  useDataSource()

  return (
    <div className="app">
      <div className="app-header">
        <StatusBar />
        <CategoryFilter />
      </div>
      <div className="app-grid">
        <TrackMap />
        <TimingTower />
        <OnboardPanel />
        <WeatherWidget />
      </div>
      <footer className="app-footer">
        Timing data via Timing71 · property of ACO / Al Kamel Systems · personal use only
      </footer>
    </div>
  )
}
