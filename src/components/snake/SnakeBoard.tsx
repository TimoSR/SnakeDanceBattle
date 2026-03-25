import { useEffect, useRef, useState } from 'react'
import type { GameStatus } from '@/lib/snake'

interface SnakeBoardProps {
  width: number
  height: number
  status: GameStatus
  onRestart: () => void
  foodKeys: Set<string>
  snakeCells: Set<string>
  purpleBonusKey: string | null
  yellowBonusKey: string | null
  pinkBonusKey: string | null
  boardEffect: 'none' | 'eat' | 'damage' | 'penalty'
  isSpeedBoostActive: boolean
  isPurpleSlowMotionActive: boolean
  isPermanentPointsBoostActive: boolean
  isDiscoBurstActive: boolean
  discoBurstHue: number | null
  discoHue: number
  yellowWaveActive: boolean
  yellowWaveExpanded: boolean
  areFoodsPurple: boolean
  eatParticleBursts: Array<{
    id: number
    color: 'apple' | 'purple' | 'yellow' | 'pink'
    x: number
    y: number
  }>
  pointsPopups: Array<{
    id: number
    text: string
    tone: 'default' | 'penalty'
  }>
}

export default function SnakeBoard({
  width,
  height,
  status,
  onRestart,
  foodKeys,
  snakeCells,
  purpleBonusKey,
  yellowBonusKey,
  pinkBonusKey,
  boardEffect,
  isSpeedBoostActive,
  isPurpleSlowMotionActive,
  isPermanentPointsBoostActive,
  isDiscoBurstActive,
  discoBurstHue,
  discoHue,
  yellowWaveActive,
  yellowWaveExpanded,
  areFoodsPurple,
  eatParticleBursts,
  pointsPopups,
}: SnakeBoardProps) {
  const [gameOverDropFxKey, setGameOverDropFxKey] = useState(0)
  const previousStatusRef = useRef(status)

  useEffect(() => {
    if (previousStatusRef.current !== 'gameOver' && status === 'gameOver') {
      setGameOverDropFxKey((current) => current + 1)
    }
    previousStatusRef.current = status
  }, [status])

  const cells: JSX.Element[] = []
  const particleVectors = [
    { x: -88, y: -36, delay: 0 },
    { x: -64, y: -82, delay: 18 },
    { x: -22, y: -96, delay: 30 },
    { x: 22, y: -92, delay: 44 },
    { x: 68, y: -70, delay: 56 },
    { x: 92, y: -18, delay: 70 },
    { x: 78, y: 38, delay: 82 },
    { x: 42, y: 82, delay: 96 },
    { x: -8, y: 94, delay: 108 },
    { x: -52, y: 78, delay: 120 },
    { x: -86, y: 34, delay: 132 },
    { x: -96, y: -8, delay: 146 },
  ] as const
  const gameOverDropParticles = [
    { left: 6, delay: 0, size: 12 },
    { left: 11, delay: 70, size: 10 },
    { left: 16, delay: 40, size: 13 },
    { left: 22, delay: 110, size: 10 },
    { left: 27, delay: 20, size: 12 },
    { left: 33, delay: 95, size: 13 },
    { left: 38, delay: 55, size: 10 },
    { left: 44, delay: 130, size: 12 },
    { left: 50, delay: 30, size: 13 },
    { left: 56, delay: 105, size: 10 },
    { left: 62, delay: 50, size: 12 },
    { left: 68, delay: 140, size: 10 },
    { left: 74, delay: 80, size: 13 },
    { left: 80, delay: 125, size: 10 },
    { left: 86, delay: 65, size: 12 },
    { left: 92, delay: 155, size: 11 },
  ] as const
  const rippleOffsets = [
    { x: 0, y: 0, delay: 0 },
    { x: -1, y: 0, delay: 90 },
    { x: 1, y: 0, delay: 90 },
    { x: 0, y: -1, delay: 90 },
    { x: 0, y: 1, delay: 90 },
    { x: -1, y: -1, delay: 170 },
    { x: 1, y: -1, delay: 170 },
    { x: -1, y: 1, delay: 170 },
    { x: 1, y: 1, delay: 170 },
    { x: -2, y: 0, delay: 260 },
    { x: 2, y: 0, delay: 260 },
    { x: 0, y: -2, delay: 260 },
    { x: 0, y: 2, delay: 260 },
  ] as const
  const purpleExtraRippleOffsets = [
    { x: -3, y: 0, delay: 350 },
    { x: 3, y: 0, delay: 350 },
    { x: 0, y: -3, delay: 350 },
    { x: 0, y: 3, delay: 350 },
    { x: -2, y: -2, delay: 320 },
    { x: 2, y: -2, delay: 320 },
    { x: -2, y: 2, delay: 320 },
    { x: 2, y: 2, delay: 320 },
  ] as const
  const purpleDoubleRippleOffsets = [
    { x: -4, y: 0, delay: 430 },
    { x: 4, y: 0, delay: 430 },
    { x: 0, y: -4, delay: 430 },
    { x: 0, y: 4, delay: 430 },
    { x: -3, y: -3, delay: 400 },
    { x: 3, y: -3, delay: 400 },
    { x: -3, y: 3, delay: 400 },
    { x: 3, y: 3, delay: 400 },
    { x: -5, y: -1, delay: 480 },
    { x: -5, y: 1, delay: 480 },
    { x: 5, y: -1, delay: 480 },
    { x: 5, y: 1, delay: 480 },
    { x: -1, y: -5, delay: 480 },
    { x: 1, y: -5, delay: 480 },
    { x: -1, y: 5, delay: 480 },
    { x: 1, y: 5, delay: 480 },
  ] as const
  const specialRippleOffsets = [...rippleOffsets, ...purpleExtraRippleOffsets] as const
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`
      let className =
        'aspect-square w-full border border-sky-400/30 shadow-[inset_0_0_3px_rgba(56,189,248,0.14)] bg-black'
      if (key === purpleBonusKey) {
        className =
          'aspect-square w-full border border-sky-300/40 bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.95)]'
      } else if (key === yellowBonusKey) {
        className =
          'aspect-square w-full border border-sky-300/40 bg-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.92)]'
      } else if (key === pinkBonusKey) {
        className =
          'aspect-square w-full border border-sky-300/40 bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.95)]'
      } else if (foodKeys.has(key)) {
        className = areFoodsPurple
          ? 'aspect-square w-full border border-sky-300/40 bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.95)]'
          : 'aspect-square w-full border border-sky-300/40 bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.95)]'
      } else if (snakeCells.has(key)) {
        className =
          'relative z-20 aspect-square w-full border border-sky-300/40 bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]'
      }

      cells.push(<div key={key} className={className} />)
    }
  }

  return (
    <div className="relative w-fit self-center rounded">
      {status === 'gameOver' && (
        <div key={`game-over-drop-${gameOverDropFxKey}`} className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
          {gameOverDropParticles.map((particle, index) => (
            <span
              key={`game-over-drop-${gameOverDropFxKey}-${index}`}
              className="snake-gameover-drop"
              style={
                {
                  left: `${particle.left}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  animationDelay: `${particle.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      {status === 'gameOver' && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="min-w-[16rem] rounded border border-sky-400/60 bg-black/85 px-6 py-5 text-center shadow-[0_0_28px_rgba(56,189,248,0.55)] ring-1 ring-sky-300/60 sm:min-w-[19rem] sm:px-8 sm:py-6">
            <p className="mb-4 font-mono text-2xl font-black uppercase tracking-[0.18em] text-sky-100 sm:text-3xl">
              Game Over
            </p>
            <button
              type="button"
              onClick={onRestart}
              className="pointer-events-auto rounded border border-sky-300/70 bg-gray-900/95 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.45)]"
            >
              Restart (R)
            </button>
          </div>
        </div>
      )}
      {pointsPopups.map((popup) => {
        const pointsPopupSizeClass =
          popup.text === '1.5X'
            ? 'text-7xl'
            : popup.text === '5X'
              ? 'text-8xl'
              : popup.text === '10X'
                ? 'text-9xl'
                : 'text-8xl'
        return (
          <div
            key={popup.id}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <span
              className={`${
                popup.tone === 'penalty'
                  ? 'snake-points-popup-penalty text-red-400'
                  : 'snake-points-popup text-yellow-300'
              } ${pointsPopupSizeClass} font-black tracking-wider`}
            >
              {popup.text}
            </span>
          </div>
        )
      })}
      {eatParticleBursts.map((burst) => {
        const activeRippleOffsets =
          burst.color === 'purple'
            ? [...rippleOffsets, ...purpleExtraRippleOffsets]
            : rippleOffsets
        const particleColorClass =
          burst.color === 'apple'
            ? 'bg-red-400 text-red-300'
            : burst.color === 'purple'
              ? 'bg-purple-400 text-purple-300'
              : burst.color === 'yellow'
                ? 'bg-yellow-300 text-yellow-200'
                : 'bg-pink-400 text-pink-300'
        const rippleColorClass =
          burst.color === 'apple'
            ? 'bg-red-400/45'
            : burst.color === 'purple'
              ? 'bg-purple-400/45'
              : burst.color === 'yellow'
                ? 'bg-yellow-300/50'
                : 'bg-pink-400/45'

        return (
          <div key={`burst-${burst.id}`}>
            {burst.color !== 'apple' && (
              <div className="pointer-events-none absolute inset-0 z-[5]">
                {(burst.color === 'purple'
                  ? [...specialRippleOffsets, ...purpleDoubleRippleOffsets]
                  : specialRippleOffsets
                ).map((offset, index) => {
                  const x = burst.x + offset.x
                  const y = burst.y + offset.y
                  if (x < 0 || x >= width || y < 0 || y >= height) {
                    return null
                  }
                  return (
                    <span
                      key={`ripple-${burst.id}-${index}`}
                      className={`snake-cell-ripple ${rippleColorClass}`}
                      style={
                        {
                          left: `${(x / width) * 100}%`,
                          top: `${(y / height) * 100}%`,
                          width: `${100 / width}%`,
                          height: `${100 / height}%`,
                          animationDelay: `${offset.delay}ms`,
                        } as React.CSSProperties
                      }
                    />
                  )
                })}
              </div>
            )}
            <div
              className="pointer-events-none absolute z-30"
              style={{
                left: `${((burst.x + 0.5) / width) * 100}%`,
                top: `${((burst.y + 0.5) / height) * 100}%`,
              }}
            >
              {particleVectors.map((vector, index) => (
                <span
                  key={`${burst.id}-${index}`}
                  className={`snake-eat-particle ${particleColorClass}`}
                  style={
                    {
                      '--snake-particle-x': `${vector.x}px`,
                      '--snake-particle-y': `${vector.y}px`,
                      animationDelay: `${vector.delay}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>
        )
      })}
      <div
        className="pointer-events-none absolute -inset-2 z-10 rounded-xl transition-all duration-200"
        style={{
          boxShadow: `0 0 ${
            isDiscoBurstActive ? 54 : 28
          }px hsla(${isDiscoBurstActive ? discoBurstHue ?? discoHue : discoHue}, 95%, 60%, ${
            isDiscoBurstActive ? 0.9 : 0.5
          })`,
        }}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-20 rounded transition-all duration-700 ease-out ${
          yellowWaveActive
            ? yellowWaveExpanded
              ? 'scale-[1.6] opacity-0'
              : 'scale-35 opacity-90'
            : 'scale-35 opacity-0'
        }`}
        style={{
          background:
            'repeating-radial-gradient(circle, rgba(250,204,21,0.8) 0 3%, rgba(250,204,21,0.35) 3% 6%, rgba(250,204,21,0) 6% 12%)',
        }}
      />
      <div
        className={`grid w-fit rounded border border-sky-500/50 bg-transparent ring-1 ring-sky-400/35 transition duration-150 ${
          boardEffect === 'eat'
            ? 'scale-[1.015] shadow-[0_0_38px_rgba(52,211,153,0.7)]'
            : boardEffect === 'penalty'
              ? 'scale-[1.01] shadow-[0_0_32px_rgba(239,68,68,0.68)] ring-2 ring-red-500/55'
              : boardEffect === 'damage'
                ? 'scale-[1.01] shadow-[0_0_40px_rgba(239,68,68,0.75)]'
                : isPurpleSlowMotionActive
                  ? 'scale-100 shadow-[0_0_34px_rgba(196,181,253,0.72)] ring-2 ring-violet-300/60'
                : isSpeedBoostActive
                  ? 'scale-100 shadow-[0_0_20px_rgba(168,85,247,0.42)] ring-2 ring-purple-500/45'
                : isPermanentPointsBoostActive
                  ? 'scale-100 shadow-[0_0_40px_rgba(250,204,21,0.68)]'
                  : 'scale-100 shadow-[0_0_20px_rgba(56,189,248,0.42)]'
        }`}
        style={{
          width: '33vw',
          height: '33vw',
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        }}
      >
        {cells}
      </div>
    </div>
  )
}
