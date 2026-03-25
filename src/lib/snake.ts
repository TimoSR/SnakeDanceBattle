export type Direction = 'up' | 'down' | 'left' | 'right'

export type GameStatus = 'running' | 'paused' | 'gameOver'

export interface Point {
  x: number
  y: number
}

export interface SnakeState {
  width: number
  height: number
  initialLength: number
  initialDirection: Direction
  snake: Point[]
  direction: Direction
  pendingDirection: Direction
  foods: Point[]
  foodTargetCount: number
  score: number
  status: GameStatus
  tickCount: number
  random: () => number
}

export interface CreateInitialStateOptions {
  initialLength?: number
  initialDirection?: Direction
  minFoodCount?: number
  maxFoodCount?: number
  random?: () => number
}

const DEFAULT_LENGTH = 3
const DEFAULT_MIN_FOOD = 7
const DEFAULT_MAX_FOOD = 9

const directionVectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const oppositeDirection: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

function isOutOfBounds(point: Point, width: number, height: number): boolean {
  return point.x < 0 || point.y < 0 || point.x >= width || point.y >= height
}

function wrapPoint(point: Point, width: number, height: number): Point {
  return {
    x: (point.x + width) % width,
    y: (point.y + height) % height,
  }
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`
}

function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

function buildInitialSnake(
  width: number,
  height: number,
  length: number,
  direction: Direction
): Point[] {
  const safeLength = Math.max(2, Math.min(length, width * height))
  const center: Point = {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
  }
  const reverse = directionVectors[oppositeDirection[direction]]
  const snake: Point[] = []

  for (let i = 0; i < safeLength; i += 1) {
    snake.push({
      x: center.x + reverse.x * i,
      y: center.y + reverse.y * i,
    })
  }

  return snake.filter((segment) => !isOutOfBounds(segment, width, height))
}

function spawnFoods(
  snake: Point[],
  existingFoods: Point[],
  width: number,
  height: number,
  random: () => number,
  targetCount: number
): Point[] {
  const occupied = new Set(snake.map(pointKey))
  const foods = [...existingFoods]
  for (const food of foods) {
    occupied.add(pointKey(food))
  }

  const emptyCells: Point[] = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`
      if (!occupied.has(key)) {
        emptyCells.push({ x, y })
      }
    }
  }

  let foodsToAdd = Math.max(0, targetCount - foods.length)
  while (foodsToAdd > 0 && emptyCells.length > 0) {
    const index = Math.floor(random() * emptyCells.length)
    const chosen = emptyCells.splice(Math.max(0, Math.min(index, emptyCells.length - 1)), 1)[0]
    foods.push(chosen)
    foodsToAdd -= 1
  }

  return foods
}

export function createInitialState(
  width: number,
  height: number,
  options: CreateInitialStateOptions = {}
): SnakeState {
  const initialLength = options.initialLength ?? DEFAULT_LENGTH
  const initialDirection = options.initialDirection ?? 'right'
  const random = options.random ?? Math.random
  const minFoodCount = options.minFoodCount ?? DEFAULT_MIN_FOOD
  const maxFoodCount = options.maxFoodCount ?? DEFAULT_MAX_FOOD
  const safeMin = Math.max(1, Math.min(minFoodCount, maxFoodCount))
  const safeMax = Math.max(safeMin, maxFoodCount)
  const foodTargetCount = randomInt(safeMin, safeMax, random)

  const snake = buildInitialSnake(width, height, initialLength, initialDirection)
  const foods = spawnFoods(snake, [], width, height, random, foodTargetCount)

  return {
    width,
    height,
    initialLength: Math.max(2, initialLength),
    initialDirection,
    snake,
    direction: initialDirection,
    pendingDirection: initialDirection,
    foods,
    foodTargetCount,
    score: 0,
    status: 'running',
    tickCount: 0,
    random,
  }
}

export function setDirection(state: SnakeState, nextDirection: Direction): SnakeState {
  if (state.status === 'gameOver') {
    return state
  }

  if (oppositeDirection[state.direction] === nextDirection) {
    return state
  }

  return {
    ...state,
    pendingDirection: nextDirection,
  }
}

export function tick(state: SnakeState): SnakeState {
  if (state.status !== 'running') {
    return state
  }

  const nextDirection = state.pendingDirection
  const vector = directionVectors[nextDirection]
  const head = state.snake[0]
  const attemptedHead: Point = {
    x: head.x + vector.x,
    y: head.y + vector.y,
  }
  const nextHead = wrapPoint(attemptedHead, state.width, state.height)

  const eatenFoodIndex = state.foods.findIndex((food) => pointsEqual(nextHead, food))
  const ateFood = eatenFoodIndex !== -1

  const nextSnake = [nextHead, ...state.snake]
  if (!ateFood) {
    nextSnake.pop()
  }

  const nextBodyKeys = new Set(nextSnake.slice(1).map(pointKey))
  if (nextBodyKeys.has(pointKey(nextHead))) {
    return {
      ...state,
      direction: nextDirection,
      pendingDirection: nextDirection,
      status: 'gameOver',
    }
  }

  const remainingFoods = ateFood
    ? state.foods.filter((_, index) => index !== eatenFoodIndex)
    : state.foods
  const nextFoods = spawnFoods(
    nextSnake,
    remainingFoods,
    state.width,
    state.height,
    state.random,
    state.foodTargetCount
  )

  return {
    ...state,
    snake: nextSnake,
    direction: nextDirection,
    pendingDirection: nextDirection,
    foods: nextFoods,
    score: ateFood ? state.score + 1 : state.score,
    tickCount: state.tickCount + 1,
    status: nextFoods.length === 0 ? 'gameOver' : state.status,
  }
}

export function restart(state: SnakeState): SnakeState {
  return createInitialState(state.width, state.height, {
    initialLength: state.initialLength,
    initialDirection: state.initialDirection,
    random: state.random,
  })
}
