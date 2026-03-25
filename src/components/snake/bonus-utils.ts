import type { Direction } from '@/lib/snake'
import { directionVectors } from '@/components/snake/constants'
import type { MovingBonusState } from '@/components/snake/types'

export function randomFreeCell(
  width: number,
  height: number,
  occupied: Set<string>
): { x: number; y: number } | null {
  const free: Array<{ x: number; y: number }> = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`
      if (!occupied.has(key)) {
        free.push({ x, y })
      }
    }
  }

  if (free.length === 0) {
    return null
  }

  return free[Math.floor(Math.random() * free.length)]
}

export function randomDirection(): Direction {
  const directions: Direction[] = ['up', 'down', 'left', 'right']
  return directions[Math.floor(Math.random() * directions.length)]
}

export function moveBonusWithDirectionChanges(
  bonus: MovingBonusState,
  width: number,
  height: number,
  turnChance: number,
  blockedCells: Set<string>
): MovingBonusState {
  if (!bonus.active) {
    return bonus
  }

  const nextDirection = Math.random() < turnChance ? randomDirection() : bonus.direction
  const vector = directionVectors[nextDirection]
  let nextX = bonus.x + vector.x
  let nextY = bonus.y + vector.y

  if (
    nextX < 0 ||
    nextX >= width ||
    nextY < 0 ||
    nextY >= height ||
    blockedCells.has(`${nextX},${nextY}`)
  ) {
    const options: Direction[] = ['up', 'down', 'left', 'right']
    const shuffled = options.sort(() => Math.random() - 0.5)
    let found: Direction | null = null

    for (const candidate of shuffled) {
      const candidateVector = directionVectors[candidate]
      const candidateX = bonus.x + candidateVector.x
      const candidateY = bonus.y + candidateVector.y
      if (
        candidateX >= 0 &&
        candidateX < width &&
        candidateY >= 0 &&
        candidateY < height &&
        !blockedCells.has(`${candidateX},${candidateY}`)
      ) {
        found = candidate
        break
      }
    }

    if (found === null) {
      return bonus
    }

    const fallbackVector = directionVectors[found]
    nextX = bonus.x + fallbackVector.x
    nextY = bonus.y + fallbackVector.y

    return {
      ...bonus,
      direction: found,
      x: nextX,
      y: nextY,
    }
  }

  return {
    ...bonus,
    direction: nextDirection,
    x: nextX,
    y: nextY,
  }
}
