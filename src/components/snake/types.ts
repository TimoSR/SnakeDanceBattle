import type { Direction } from '@/lib/snake'

export interface SnakeGameProps {
  topTenCutoffScore: number | null
  highScore: number
  onRoundComplete: (score: number) => void
}

export interface MovingBonusState {
  active: boolean
  hasSpawned: boolean
  x: number
  y: number
  direction: Direction
}
