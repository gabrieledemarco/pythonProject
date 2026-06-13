/**
 * Pit Wall — RaceState type definitions
 * These types define the normalized race state used throughout the frontend.
 * The Python bridge normalizes raw CTD data into this schema via normalizer.py.
 */

export type Category = 'HYPERCAR' | 'LMP2' | 'LMGT3';

export type SectorStatus = 'best' | 'improved' | 'normal';

export interface SectorTime {
  /** Formatted time string, e.g. "32.456" */
  time: string;
  status: SectorStatus;
}

export interface CarState {
  /** Car number as string, e.g. "7", "50" */
  number: string;
  team: string;
  category: Category;
  /** All registered drivers for this entry */
  drivers: string[];
  /** Currently driving (may be undefined if unknown) */
  currentDriver?: string;
  /** Overall race position */
  position: number;
  /** Position within class */
  classPosition: number;
  /** Gap to overall leader, e.g. "+1 lap", "+12.345" */
  gapToLeader: string;
  /** Gap to car directly ahead in overall standings */
  interval: string;
  /**
   * Position on track as a fraction of lap distance (0.0 = start/finish, 1.0 wraps to 0.0).
   * Used to place car dots on the SVG track map.
   */
  trackProgress: number;
  sectors: {
    s1?: SectorTime;
    s2?: SectorTime;
    s3?: SectorTime;
  };
  /** Last completed lap time, e.g. "3:24.567" */
  lastLap?: string;
  /** Personal best lap time */
  bestLap?: string;
  /** True when car is in the pit lane */
  inPit: boolean;
  /** Number of completed laps */
  laps: number;
}

export type Flag = 'green' | 'yellow' | 'red' | 'sc' | 'fcy' | 'chequered';

export interface SessionState {
  flag: Flag;
  /** Formatted time remaining, e.g. "22:14:33" */
  timeRemaining: string;
  /** Elapsed race time, e.g. "01:45:27" */
  elapsed: string;
  trackName: string;
}

export interface RaceState {
  session: SessionState;
  /** All cars, sorted by overall position */
  cars: CarState[];
  /** Unix timestamp (ms) of last update */
  updatedAt: number;
  /** Data origin — 'bridge' = live Timing71 feed, 'sim' = built-in simulation */
  source: 'bridge' | 'sim';
}
