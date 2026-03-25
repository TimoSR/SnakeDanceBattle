import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Direction, type GameStatus, createInitialState, restart, setDirection, tick } from '@/lib/snake'
import {
  BOOST_DELTA_MS,
  BOOST_DURATION_MS,
  GRID_SIZE,
  INITIAL_LENGTH,
  MAX_PURPLE_SPAWNS,
  MIN_TICK_MS,
  SPEED_STEP_MS,
  SPEED_STEP_TICKS,
  TICK_MS,
  directionByKey,
} from '@/components/snake/constants'
import { moveBonusWithDirectionChanges, randomDirection, randomFreeCell } from '@/components/snake/bonus-utils'
import type { MovingBonusState } from '@/components/snake/types'

function togglePause(status: GameStatus): GameStatus {
  if (status === 'gameOver') {
    return status
  }
  return status === 'running' ? 'paused' : 'running'
}

interface UseSnakeGameParams {
  onRoundComplete: (score: number) => void
}

type EatParticleColor = 'apple' | 'purple' | 'yellow' | 'pink'
interface EatParticleState {
  id: number
  color: EatParticleColor
  x: number
  y: number
}

interface SpiralBonusState {
  active: boolean
  hasSpawned: boolean
  x: number
  y: number
  spiralDirectionIndex: number
  spiralSegmentLength: number
  spiralStepsInSegment: number
  spiralSegmentsAtCurrentLength: number
}

const TIME_POINTS_PER_TICK = 1
const RED_BLOCK_BONUS_POINTS = 4
const PURPLE_BLOCK_BONUS_POINTS = 8
const YELLOW_BLOCK_BONUS_POINTS = 6
const PINK_BLOCK_BONUS_POINTS = 10
const APPLE_BONUS_MULTIPLIER = 1.5
const PINK_BONUS_MULTIPLIER = 5
const PURPLE_PERMANENT_POINTS_MULTIPLIER = 10
const EXPONENTIAL_GROWTH_RATE = 1.08
const MAX_EXPONENTIAL_LEVEL = 60
const PURPLE_TELEPORT_INTERVAL_MS = 10000
const PINK_SPIRAL_STEP_INTERVAL_MS = 260
const YELLOW_SPEED_BOOST_DURATION_MS = 5000
const PURPLE_SLOW_MOTION_DURATION_MS = 4400
const PURPLE_SPAWN_CHANCE_AFTER_APPLE = 0.35
const YELLOW_SPAWN_CHANCE_AFTER_APPLE = 0.9
const PINK_SPAWN_CHANCE_AFTER_APPLE = 0.7
const APPLE_BONUS_RECOVERY = 1.5
const YELLOW_BONUS_RECOVERY = 2
const PINK_BONUS_RECOVERY = 5
const PURPLE_BONUS_RECOVERY = 10
const MIN_SNAKE_LENGTH = 2
const PURPLE_FOOD_MODE_LENGTH = 1
const PINK_SPIRAL_DIRECTIONS: Array<{ x: number; y: number }> = [
  { x: 0, y: 1 }, // down
  { x: 1, y: 0 }, // side (right)
  { x: 0, y: -1 }, // up
  { x: -1, y: 0 }, // left
]

function formatBonusMultiplierForPopup(value: number): string {
  if (Math.abs(value) < 10) {
    return value.toFixed(2)
  }
  if (Math.abs(value) < 1000) {
    return value.toFixed(1)
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function willWrapOnNextMove(
  x: number,
  y: number,
  direction: Direction,
  width: number,
  height: number
): boolean {
  const nextX = direction === 'left' ? x - 1 : direction === 'right' ? x + 1 : x
  const nextY = direction === 'up' ? y - 1 : direction === 'down' ? y + 1 : y
  return nextX < 0 || nextX >= width || nextY < 0 || nextY >= height
}

function nextPinkSpiralState(
  current: SpiralBonusState,
  width: number,
  height: number,
  blockedCells: Set<string>
): SpiralBonusState {
  const direction = PINK_SPIRAL_DIRECTIONS[current.spiralDirectionIndex]
  const candidateX = current.x + direction.x
  const candidateY = current.y + direction.y
  const canMove =
    candidateX >= 0 &&
    candidateX < width &&
    candidateY >= 0 &&
    candidateY < height &&
    !blockedCells.has(`${candidateX},${candidateY}`)

  const nextStepsInSegment = current.spiralStepsInSegment + 1
  const segmentComplete = nextStepsInSegment >= current.spiralSegmentLength

  let nextDirectionIndex = current.spiralDirectionIndex
  let nextSegmentLength = current.spiralSegmentLength
  let nextSteps = nextStepsInSegment
  let nextSegmentsAtLength = current.spiralSegmentsAtCurrentLength

  if (segmentComplete) {
    nextDirectionIndex = (current.spiralDirectionIndex + 1) % PINK_SPIRAL_DIRECTIONS.length
    nextSteps = 0
    nextSegmentsAtLength = current.spiralSegmentsAtCurrentLength + 1
    if (nextSegmentsAtLength >= 2) {
      nextSegmentLength = current.spiralSegmentLength + 1
      nextSegmentsAtLength = 0
    }
  }

  return {
    ...current,
    x: canMove ? candidateX : current.x,
    y: canMove ? candidateY : current.y,
    spiralDirectionIndex: nextDirectionIndex,
    spiralSegmentLength: nextSegmentLength,
    spiralStepsInSegment: nextSteps,
    spiralSegmentsAtCurrentLength: nextSegmentsAtLength,
  }
}

export function useSnakeGame({ onRoundComplete }: UseSnakeGameParams) {
  const [game, setGame] = useState(() =>
    createInitialState(GRID_SIZE, GRID_SIZE, { initialLength: INITIAL_LENGTH })
  )
  const [boardEffect, setBoardEffect] = useState<'none' | 'eat' | 'damage' | 'penalty'>('none')
  const [speedBoostExpiresAt, setSpeedBoostExpiresAt] = useState<number | null>(null)
  const [purpleSlowMotionExpiresAt, setPurpleSlowMotionExpiresAt] = useState<number | null>(null)
  const [purplePointsBoostStacks, setPurplePointsBoostStacks] = useState(0)
  const [pointAmplificationLevel, setPointAmplificationLevel] = useState(0)
  const [bonusMultiplierOffset, setBonusMultiplierOffset] = useState(0)
  const [discoBurstHue, setDiscoBurstHue] = useState<number | null>(null)
  const [isDiscoBurstActive, setIsDiscoBurstActive] = useState(false)
  const [yellowWaveKey, setYellowWaveKey] = useState(0)
  const [yellowWaveActive, setYellowWaveActive] = useState(false)
  const [yellowWaveExpanded, setYellowWaveExpanded] = useState(false)
  const [areFoodsPurple, setAreFoodsPurple] = useState(false)
  const [purpleFoodModeEatsLeft, setPurpleFoodModeEatsLeft] = useState(0)
  const [applesEatenCount, setApplesEatenCount] = useState(0)
  const [pointsPopup, setPointsPopup] = useState<{
    id: number
    text: string
    tone: 'default' | 'penalty'
  } | null>(null)
  const [eatParticleBursts, setEatParticleBursts] = useState<EatParticleState[]>([])
  const [purpleBonus, setPurpleBonus] = useState<MovingBonusState>({
    active: false,
    hasSpawned: false,
    x: 0,
    y: 0,
    direction: 'right',
  })
  const [purpleSpawnCount, setPurpleSpawnCount] = useState(0)
  const [yellowBonus, setYellowBonus] = useState<MovingBonusState>({
    active: false,
    hasSpawned: false,
    x: 0,
    y: 0,
    direction: 'left',
  })
  const [pinkBonus, setPinkBonus] = useState<SpiralBonusState>({
    active: false,
    hasSpawned: false,
    x: 0,
    y: 0,
    spiralDirectionIndex: 0,
    spiralSegmentLength: 2,
    spiralStepsInSegment: 0,
    spiralSegmentsAtCurrentLength: 0,
  })

  const previousStatusRef = useRef<GameStatus>(game.status)
  const previousSnakeLengthRef = useRef(game.snake.length)
  const discoBurstTimeoutRef = useRef<number | null>(null)
  const boardEffectStartTimeoutRef = useRef<number | null>(null)
  const boardEffectEndTimeoutRef = useRef<number | null>(null)
  const pointsPopupTimeoutRef = useRef<number | null>(null)
  const eatParticleBurstIdRef = useRef(0)
  const eatParticleTimeoutsRef = useRef<number[]>([])
  const lastBonusSpawnRollAppleRef = useRef(0)
  const isSpeedBoostActive = speedBoostExpiresAt !== null
  const isPurpleSlowMotionActive = purpleSlowMotionExpiresAt !== null
  const isPermanentPointsBoostActive = purplePointsBoostStacks > 0
  const permanentPointsMultiplier = Math.pow(PURPLE_PERMANENT_POINTS_MULTIPLIER, purplePointsBoostStacks)
  const amplificationMultiplier = Math.pow(
    EXPONENTIAL_GROWTH_RATE,
    Math.min(pointAmplificationLevel, MAX_EXPONENTIAL_LEVEL)
  )
  const baseBonusMultiplier = permanentPointsMultiplier * amplificationMultiplier
  const bonusMultiplier = baseBonusMultiplier + bonusMultiplierOffset
  const discoHue = (game.tickCount * (isSpeedBoostActive ? 28 : 18) + game.score * 27) % 360
  const progressiveTickMs = Math.max(
    MIN_TICK_MS,
    TICK_MS - Math.floor(game.tickCount / SPEED_STEP_TICKS) * SPEED_STEP_MS
  )
  const boostedTickMs = isSpeedBoostActive
    ? Math.max(MIN_TICK_MS - BOOST_DELTA_MS, progressiveTickMs - BOOST_DELTA_MS)
    : progressiveTickMs
  const effectiveTickMs = isPurpleSlowMotionActive
    ? Math.min(420, Math.round(boostedTickMs * 1.65))
    : boostedTickMs

  const triggerDiscoBurst = useCallback((hue: number, durationMs: number) => {
    setDiscoBurstHue(hue)
    setIsDiscoBurstActive(true)
    if (discoBurstTimeoutRef.current !== null) {
      window.clearTimeout(discoBurstTimeoutRef.current)
    }
    discoBurstTimeoutRef.current = window.setTimeout(() => {
      setIsDiscoBurstActive(false)
      discoBurstTimeoutRef.current = null
    }, durationMs)
  }, [])

  const triggerBoardEffect = useCallback((effect: 'eat' | 'damage' | 'penalty', durationMs: number) => {
    if (boardEffectStartTimeoutRef.current !== null) {
      window.clearTimeout(boardEffectStartTimeoutRef.current)
      boardEffectStartTimeoutRef.current = null
    }
    if (boardEffectEndTimeoutRef.current !== null) {
      window.clearTimeout(boardEffectEndTimeoutRef.current)
      boardEffectEndTimeoutRef.current = null
    }

    // Reset first so repeated fast pickups can retrigger the same visual effect.
    setBoardEffect('none')
    boardEffectStartTimeoutRef.current = window.setTimeout(() => {
      setBoardEffect(effect)
      boardEffectStartTimeoutRef.current = null
    }, 0)

    boardEffectEndTimeoutRef.current = window.setTimeout(() => {
      setBoardEffect('none')
      boardEffectEndTimeoutRef.current = null
    }, durationMs)
  }, [])

  const triggerPointsPopup = useCallback((text: string, tone: 'default' | 'penalty' = 'default') => {
    setPointsPopup((current) => ({
      id: (current?.id ?? 0) + 1,
      text,
      tone,
    }))
    if (pointsPopupTimeoutRef.current !== null) {
      window.clearTimeout(pointsPopupTimeoutRef.current)
    }
    pointsPopupTimeoutRef.current = window.setTimeout(() => {
      setPointsPopup(null)
      pointsPopupTimeoutRef.current = null
    }, 520)
  }, [])

  const triggerEatParticles = useCallback((color: EatParticleColor, x: number, y: number) => {
    const id = eatParticleBurstIdRef.current + 1
    eatParticleBurstIdRef.current = id

    setEatParticleBursts((current) => [...current, { id, color, x, y }].slice(-8))

    const timeoutId = window.setTimeout(() => {
      setEatParticleBursts((current) => current.filter((burst) => burst.id !== id))
      eatParticleTimeoutsRef.current = eatParticleTimeoutsRef.current.filter(
        (activeTimeoutId) => activeTimeoutId !== timeoutId
      )
    }, 900)
    eatParticleTimeoutsRef.current.push(timeoutId)
  }, [])

  const recoverBonusOffset = useCallback((amount: number) => {
    setBonusMultiplierOffset((current) => {
      if (current >= 0) {
        return current
      }
      return Math.min(0, current + amount)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (discoBurstTimeoutRef.current !== null) {
        window.clearTimeout(discoBurstTimeoutRef.current)
      }
      if (boardEffectStartTimeoutRef.current !== null) {
        window.clearTimeout(boardEffectStartTimeoutRef.current)
      }
      if (boardEffectEndTimeoutRef.current !== null) {
        window.clearTimeout(boardEffectEndTimeoutRef.current)
      }
      if (pointsPopupTimeoutRef.current !== null) {
        window.clearTimeout(pointsPopupTimeoutRef.current)
      }
      for (const timeoutId of eatParticleTimeoutsRef.current) {
        window.clearTimeout(timeoutId)
      }
      eatParticleTimeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    const previousStatus = previousStatusRef.current
    if (previousStatus !== 'gameOver' && game.status === 'gameOver' && game.score > 0) {
      onRoundComplete(game.score)
    }
    if (previousStatus !== 'gameOver' && game.status === 'gameOver') {
      triggerBoardEffect('damage', 260)
      triggerDiscoBurst(2, 320)
      previousStatusRef.current = game.status
    }
    previousStatusRef.current = game.status
  }, [game.score, game.status, onRoundComplete, triggerBoardEffect, triggerDiscoBurst])

  useEffect(() => {
    if (game.tickCount > 0 && game.snake.length > previousSnakeLengthRef.current) {
      const head = game.snake[0]
      setPointAmplificationLevel((level) => level + 1)
      setApplesEatenCount((count) => count + 1)

      if (areFoodsPurple) {
        setPurplePointsBoostStacks((stacks) => stacks + 1)
        setPurpleSlowMotionExpiresAt(Date.now() + PURPLE_SLOW_MOTION_DURATION_MS)
        recoverBonusOffset(PURPLE_BONUS_RECOVERY)
        triggerBoardEffect('eat', 180)
        triggerDiscoBurst(282, 340)
        setYellowWaveKey((current) => current + 1)
        triggerPointsPopup(`${formatBonusMultiplierForPopup(bonusMultiplier)}X`)
        triggerEatParticles('purple', head.x, head.y)
        setPurpleFoodModeEatsLeft((current) => Math.max(0, current - 1))
      } else {
        triggerBoardEffect('eat', 180)
        triggerDiscoBurst(148, 260)
        recoverBonusOffset(APPLE_BONUS_RECOVERY)
        triggerPointsPopup(`${formatBonusMultiplierForPopup(bonusMultiplier)}X`)
        triggerEatParticles('apple', head.x, head.y)
      }
    }
    previousSnakeLengthRef.current = game.snake.length
  }, [
    areFoodsPurple,
    game.snake,
    game.tickCount,
    bonusMultiplier,
    recoverBonusOffset,
    triggerBoardEffect,
    triggerDiscoBurst,
    triggerEatParticles,
    triggerPointsPopup,
  ])

  useEffect(() => {
    if (areFoodsPurple && purpleFoodModeEatsLeft <= 0) {
      setAreFoodsPurple(false)
    }
  }, [areFoodsPurple, purpleFoodModeEatsLeft])

  useEffect(() => {
    if (game.score === 0 && game.tickCount === 0) {
      setBoardEffect('none')
      setYellowWaveActive(false)
      setYellowWaveExpanded(false)
      setAreFoodsPurple(false)
      setPurpleFoodModeEatsLeft(0)
      setApplesEatenCount(0)
      setPurpleBonus({
        active: false,
        hasSpawned: false,
        x: 0,
        y: 0,
        direction: 'right',
      })
      setPurpleSpawnCount(0)
      setYellowBonus({
        active: false,
        hasSpawned: false,
        x: 0,
        y: 0,
        direction: 'left',
      })
      setPinkBonus({
        active: false,
        hasSpawned: false,
        x: 0,
        y: 0,
        spiralDirectionIndex: 0,
        spiralSegmentLength: 2,
        spiralStepsInSegment: 0,
        spiralSegmentsAtCurrentLength: 0,
      })
      setSpeedBoostExpiresAt(null)
      setPurpleSlowMotionExpiresAt(null)
      setPurplePointsBoostStacks(0)
      setPointAmplificationLevel(0)
      setBonusMultiplierOffset(0)
      setIsDiscoBurstActive(false)
      setDiscoBurstHue(null)
      setPointsPopup(null)
      setEatParticleBursts([])
      lastBonusSpawnRollAppleRef.current = 0
    }
  }, [game.score, game.tickCount])

  useEffect(() => {
    if (speedBoostExpiresAt === null) {
      return
    }

    const remaining = Math.max(0, speedBoostExpiresAt - Date.now())
    const timeoutId = window.setTimeout(() => {
      setSpeedBoostExpiresAt(null)
    }, remaining)

    return () => window.clearTimeout(timeoutId)
  }, [speedBoostExpiresAt])

  useEffect(() => {
    if (purpleSlowMotionExpiresAt === null) {
      return
    }

    const remaining = Math.max(0, purpleSlowMotionExpiresAt - Date.now())
    const timeoutId = window.setTimeout(() => {
      setPurpleSlowMotionExpiresAt(null)
      setAreFoodsPurple(false)
      setPurpleFoodModeEatsLeft(0)
    }, remaining)

    return () => window.clearTimeout(timeoutId)
  }, [purpleSlowMotionExpiresAt])

  useEffect(() => {
    if (!areFoodsPurple && purpleSlowMotionExpiresAt !== null) {
      setPurpleSlowMotionExpiresAt(null)
    }
  }, [areFoodsPurple, purpleSlowMotionExpiresAt])

  useEffect(() => {
    if (yellowWaveKey === 0) {
      return
    }

    setYellowWaveActive(true)
    setYellowWaveExpanded(false)

    const rafId = window.requestAnimationFrame(() => {
      setYellowWaveExpanded(true)
    })

    const timeoutId = window.setTimeout(() => {
      setYellowWaveActive(false)
      setYellowWaveExpanded(false)
    }, 750)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [yellowWaveKey])

  useEffect(() => {
    if (game.status !== 'running' || applesEatenCount === 0) {
      return
    }
    if (lastBonusSpawnRollAppleRef.current === applesEatenCount) {
      return
    }
    lastBonusSpawnRollAppleRef.current = applesEatenCount

    const occupied = new Set(game.snake.map((segment) => `${segment.x},${segment.y}`))
    for (const food of game.foods) {
      occupied.add(`${food.x},${food.y}`)
    }
    if (purpleBonus.active) {
      occupied.add(`${purpleBonus.x},${purpleBonus.y}`)
    }
    if (yellowBonus.active) {
      occupied.add(`${yellowBonus.x},${yellowBonus.y}`)
    }
    if (pinkBonus.active) {
      occupied.add(`${pinkBonus.x},${pinkBonus.y}`)
    }

    if (
      !purpleBonus.active &&
      Math.random() < PURPLE_SPAWN_CHANCE_AFTER_APPLE
    ) {
      const spawnCell = randomFreeCell(game.width, game.height, occupied)
      if (spawnCell) {
        occupied.add(`${spawnCell.x},${spawnCell.y}`)
        setPurpleBonus({
          active: true,
          hasSpawned: true,
          x: spawnCell.x,
          y: spawnCell.y,
          direction: randomDirection(),
        })
        setPurpleSpawnCount((count) => count + 1)
      }
    }

    if (!yellowBonus.active && Math.random() < YELLOW_SPAWN_CHANCE_AFTER_APPLE) {
      const spawnCell = randomFreeCell(game.width, game.height, occupied)
      if (spawnCell) {
        occupied.add(`${spawnCell.x},${spawnCell.y}`)
        setYellowBonus({
          active: true,
          hasSpawned: true,
          x: spawnCell.x,
          y: spawnCell.y,
          direction: randomDirection(),
        })
      }
    }

    if (!pinkBonus.active && Math.random() < PINK_SPAWN_CHANCE_AFTER_APPLE) {
      const spawnCell = randomFreeCell(game.width, game.height, occupied)
      if (spawnCell) {
        setPinkBonus({
          active: true,
          hasSpawned: true,
          x: spawnCell.x,
          y: spawnCell.y,
          spiralDirectionIndex: 0,
          spiralSegmentLength: 2,
          spiralStepsInSegment: 0,
          spiralSegmentsAtCurrentLength: 0,
        })
      }
    }
  }, [
    applesEatenCount,
    game.foods,
    game.height,
    game.snake,
    game.status,
    game.width,
    pinkBonus.active,
    pinkBonus.x,
    pinkBonus.y,
    purpleBonus.active,
    purpleBonus.x,
    purpleBonus.y,
    yellowBonus.active,
    yellowBonus.x,
    yellowBonus.y,
  ])

  useEffect(() => {
    if (!purpleBonus.active || game.status !== 'running') {
      return
    }

    const snakeCells = new Set(game.snake.map((segment) => `${segment.x},${segment.y}`))
    setPurpleBonus((current) =>
      moveBonusWithDirectionChanges(current, game.width, game.height, 0.32, snakeCells)
    )
  }, [game.status, game.tickCount, game.width, game.height, game.snake, purpleBonus.active])

  const latestStateRef = useRef({
    game,
    yellowBonus,
    pinkBonus,
    purpleBonus,
  })

  useEffect(() => {
    latestStateRef.current = { game, yellowBonus, pinkBonus, purpleBonus }
  }, [game, pinkBonus, purpleBonus, yellowBonus])

  useEffect(() => {
    if (!purpleBonus.active || game.status !== 'running') {
      return
    }

    const intervalId = window.setInterval(() => {
      const { game: latestGame, yellowBonus: latestYellowBonus, pinkBonus: latestPinkBonus } =
        latestStateRef.current
      const occupied = new Set(latestGame.snake.map((segment) => `${segment.x},${segment.y}`))
      for (const food of latestGame.foods) {
        occupied.add(`${food.x},${food.y}`)
      }
      if (latestYellowBonus.active) {
        occupied.add(`${latestYellowBonus.x},${latestYellowBonus.y}`)
      }
      if (latestPinkBonus.active) {
        occupied.add(`${latestPinkBonus.x},${latestPinkBonus.y}`)
      }

      const teleportCell = randomFreeCell(latestGame.width, latestGame.height, occupied)
      if (!teleportCell) {
        return
      }

      setPurpleBonus((current) => {
        if (!current.active) {
          return current
        }
        return {
          ...current,
          x: teleportCell.x,
          y: teleportCell.y,
          direction: randomDirection(),
        }
      })
    }, PURPLE_TELEPORT_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [game.status, purpleBonus.active])

  useEffect(() => {
    if (!yellowBonus.active || game.status !== 'running') {
      return
    }

    const snakeCells = new Set(game.snake.map((segment) => `${segment.x},${segment.y}`))
    setYellowBonus((current) =>
      moveBonusWithDirectionChanges(current, game.width, game.height, 0.18, snakeCells)
    )
  }, [game.status, game.tickCount, game.width, game.height, game.snake, yellowBonus.active])

  useEffect(() => {
    if (!pinkBonus.active || game.status !== 'running') {
      return
    }

    const intervalId = window.setInterval(() => {
      const { game: latestGame } = latestStateRef.current
      const snakeCells = new Set(latestGame.snake.map((segment) => `${segment.x},${segment.y}`))
      setPinkBonus((current) => {
        if (!current.active) {
          return current
        }
        return nextPinkSpiralState(current, latestGame.width, latestGame.height, snakeCells)
      })
    }, PINK_SPIRAL_STEP_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [game.status, pinkBonus.active])

  useEffect(() => {
    if (!purpleBonus.active) {
      return
    }

    const head = game.snake[0]
    if (head.x === purpleBonus.x && head.y === purpleBonus.y) {
      setPurpleBonus((current) => ({ ...current, active: false }))
      setPurplePointsBoostStacks((stacks) => stacks + 1)
      setPurpleSlowMotionExpiresAt(Date.now() + PURPLE_SLOW_MOTION_DURATION_MS)
      setGame((current) => ({
        ...current,
        score: current.score + Math.round(PURPLE_BLOCK_BONUS_POINTS * bonusMultiplier),
      }))
      setPointAmplificationLevel((level) => level + 1)
      recoverBonusOffset(PURPLE_BONUS_RECOVERY)
      setAreFoodsPurple(true)
      setPurpleFoodModeEatsLeft(PURPLE_FOOD_MODE_LENGTH)
      triggerBoardEffect('eat', 180)
      triggerDiscoBurst(282, 340)
      setYellowWaveKey((current) => current + 1)
      triggerPointsPopup(`${formatBonusMultiplierForPopup(bonusMultiplier)}X`)
      triggerEatParticles('purple', head.x, head.y)
    }
  }, [
    game.snake,
    bonusMultiplier,
    purpleBonus.active,
    purpleBonus.x,
    purpleBonus.y,
    recoverBonusOffset,
    triggerBoardEffect,
    triggerDiscoBurst,
    triggerEatParticles,
    triggerPointsPopup,
  ])

  useEffect(() => {
    if (!yellowBonus.active) {
      return
    }

    const head = game.snake[0]
    if (head.x === yellowBonus.x && head.y === yellowBonus.y) {
      setYellowBonus((current) => ({ ...current, active: false }))
      setSpeedBoostExpiresAt(Date.now() + YELLOW_SPEED_BOOST_DURATION_MS)
      setGame((current) => ({
        ...current,
        score: current.score + Math.round(YELLOW_BLOCK_BONUS_POINTS * PINK_BONUS_MULTIPLIER * bonusMultiplier),
      }))
      setPointAmplificationLevel((level) => level + 1)
      recoverBonusOffset(YELLOW_BONUS_RECOVERY)
      triggerBoardEffect('eat', 180)
      triggerDiscoBurst(56, 340)
      setYellowWaveKey((current) => current + 1)
      triggerPointsPopup(`${formatBonusMultiplierForPopup(bonusMultiplier)}X`)
      triggerEatParticles('yellow', head.x, head.y)
    }
  }, [
    game.snake,
    bonusMultiplier,
    triggerBoardEffect,
    triggerDiscoBurst,
    recoverBonusOffset,
    triggerEatParticles,
    yellowBonus.active,
    yellowBonus.x,
    yellowBonus.y,
    triggerPointsPopup,
  ])

  useEffect(() => {
    if (!pinkBonus.active) {
      return
    }

    const head = game.snake[0]
    if (head.x === pinkBonus.x && head.y === pinkBonus.y) {
      setPinkBonus((current) => ({ ...current, active: false }))
      setGame((current) => ({
        ...current,
        snake: current.snake.slice(
          0,
          Math.max(
            MIN_SNAKE_LENGTH,
            current.snake.length - Math.max(1, Math.floor(current.snake.length / 3))
          )
        ),
        score: current.score + Math.round(PINK_BLOCK_BONUS_POINTS * bonusMultiplier),
      }))
      setPointAmplificationLevel((level) => level + 1)
      recoverBonusOffset(PINK_BONUS_RECOVERY)
      triggerBoardEffect('eat', 180)
      triggerDiscoBurst(322, 340)
      setYellowWaveKey((current) => current + 1)
      triggerPointsPopup(`${formatBonusMultiplierForPopup(bonusMultiplier)}X`)
      triggerEatParticles('pink', head.x, head.y)
    }
  }, [
    bonusMultiplier,
    game.snake,
    pinkBonus.active,
    pinkBonus.x,
    pinkBonus.y,
    recoverBonusOffset,
    triggerBoardEffect,
    triggerDiscoBurst,
    triggerEatParticles,
    triggerPointsPopup,
  ])

  useEffect(() => {
    if (game.status !== 'running') {
      return
    }

    const id = window.setInterval(() => {
      const current = latestStateRef.current.game
      const head = current.snake[0]
      const wrappedEdge = willWrapOnNextMove(
        head.x,
        head.y,
        current.pendingDirection,
        current.width,
        current.height
      )
      const next = tick(current)
      const ateFood = next.snake.length > current.snake.length
      const appleBonus = ateFood
        ? areFoodsPurple
          ? PURPLE_BLOCK_BONUS_POINTS
          : RED_BLOCK_BONUS_POINTS * APPLE_BONUS_MULTIPLIER
        : 0
      const gained = Math.round((TIME_POINTS_PER_TICK + appleBonus) * bonusMultiplier)
      const scoreBeforePenalty = current.score + gained
      const shouldApplyWrapPenalty = wrappedEdge && !areFoodsPurple
      const pointsPenalty = shouldApplyWrapPenalty ? Math.round(Math.abs(scoreBeforePenalty) * 0.1) : 0

      setGame({
        ...next,
        score: scoreBeforePenalty - pointsPenalty,
      })

      if (shouldApplyWrapPenalty) {
        triggerBoardEffect('penalty', 120)
        setBonusMultiplierOffset((currentOffset) => {
          const currentTotal = baseBonusMultiplier + currentOffset
          const nextTotal = currentTotal - baseBonusMultiplier * 0.1
          return nextTotal - baseBonusMultiplier
        })
        triggerPointsPopup('-10%', 'penalty')
      }
    }, effectiveTickMs)

    return () => window.clearInterval(id)
  }, [
    areFoodsPurple,
    baseBonusMultiplier,
    bonusMultiplier,
    effectiveTickMs,
    game.status,
    triggerBoardEffect,
    triggerPointsPopup,
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const lowerKey = event.key.toLowerCase()
      const nextDirection = directionByKey[event.key] ?? directionByKey[lowerKey]

      if (nextDirection) {
        event.preventDefault()
        setGame((current) => setDirection(current, nextDirection))
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        setGame((current) => ({
          ...current,
          status: togglePause(current.status),
        }))
        return
      }

      if (lowerKey === 'r') {
        event.preventDefault()
        setGame((current) => restart(current))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const snakeCells = useMemo(() => new Set(game.snake.map((segment) => `${segment.x},${segment.y}`)), [game.snake])
  const foodKeys = useMemo(() => new Set(game.foods.map((food) => `${food.x},${food.y}`)), [game.foods])
  const purpleBonusKey = purpleBonus.active ? `${purpleBonus.x},${purpleBonus.y}` : null
  const yellowBonusKey = yellowBonus.active ? `${yellowBonus.x},${yellowBonus.y}` : null
  const pinkBonusKey = pinkBonus.active ? `${pinkBonus.x},${pinkBonus.y}` : null

  const togglePauseAction = () =>
    setGame((current) => ({
      ...current,
      status: togglePause(current.status),
    }))

  const restartAction = () => setGame((current) => restart(current))

  return {
    game,
    boardEffect,
    isSpeedBoostActive,
    isPurpleSlowMotionActive,
    isPermanentPointsBoostActive,
    permanentPointsMultiplier,
    bonusMultiplier,
    isDiscoBurstActive,
    discoBurstHue,
    discoHue,
    yellowWaveActive,
    yellowWaveExpanded,
    areFoodsPurple,
    eatParticleBursts,
    pointsPopupText: pointsPopup?.text ?? null,
    pointsPopupTone: pointsPopup?.tone ?? 'default',
    pointsPopupId: pointsPopup?.id ?? 0,
    snakeCells,
    foodKeys,
    purpleBonusKey,
    yellowBonusKey,
    pinkBonusKey,
    togglePauseAction,
    restartAction,
  }
}
