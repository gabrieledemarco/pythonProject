import sampleState from './sample_state.json'

function cloneState(state) {
  return JSON.parse(JSON.stringify(state))
}

const SECTOR_STATUSES = ['best', 'improved', 'normal', 'normal', 'normal']

function randomSectorStatus() {
  return SECTOR_STATUSES[Math.floor(Math.random() * SECTOR_STATUSES.length)]
}

function tickCars(cars) {
  return cars.map((car) => {
    if (car.inPit) return car

    const speed = 0.003 + Math.random() * 0.005
    let progress = car.trackProgress + speed
    if (progress >= 1.0) {
      progress -= 1.0
      // new lap — randomize sector statuses
      const s = car.sectors
      return {
        ...car,
        trackProgress: progress,
        laps: car.laps + 1,
        sectors: {
          s1: s.s1 ? { ...s.s1, status: randomSectorStatus() } : undefined,
          s2: s.s2 ? { ...s.s2, status: randomSectorStatus() } : undefined,
          s3: s.s3 ? { ...s.s3, status: randomSectorStatus() } : undefined,
        },
      }
    }
    return { ...car, trackProgress: progress }
  })
}

export function createSimAdapter(onUpdate) {
  let handle = null
  let state = cloneState(sampleState)
  state.source = 'sim'

  function tick() {
    state = {
      ...state,
      cars: tickCars(state.cars),
      updatedAt: Date.now(),
    }
    onUpdate(state)
  }

  return {
    start() {
      tick()
      handle = setInterval(tick, 500)
    },
    stop() {
      if (handle !== null) {
        clearInterval(handle)
        handle = null
      }
    },
  }
}
