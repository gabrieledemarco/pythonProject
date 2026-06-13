import { create } from 'zustand'

const useRaceStore = create((set) => ({
  raceState: null,
  connectionStatus: 'sim',
  categoryFilter: 'ALL',

  setRaceState: (raceState) => set({ raceState }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
}))

export default useRaceStore
