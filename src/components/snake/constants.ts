import type { Direction } from '@/lib/snake'

export const GRID_SIZE = 20
export const TICK_MS = 150
export const MIN_TICK_MS = 85
export const BOOST_DELTA_MS = 35
export const SPEED_STEP_TICKS = 30
export const SPEED_STEP_MS = 4
export const INITIAL_LENGTH = 3
export const BOOST_DURATION_MS = 7000
export const MAX_PURPLE_SPAWNS = 2

export const directionByKey: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
}

export const directionVectors: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}
