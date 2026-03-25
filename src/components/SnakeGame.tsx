'use client'

import { useEffect, useRef, useState } from 'react'
import SnakeBoard from '@/components/snake/SnakeBoard'
import SnakeHeader from '@/components/snake/SnakeHeader'
import { useSnakeGame } from '@/components/snake/useSnakeGame'
import type { SnakeGameProps } from '@/components/snake/types'

export default function SnakeGame({ topTenCutoffScore, onRoundComplete }: SnakeGameProps) {
  const RAPID_GAIN_WINDOW_MS = 1800
  const RAPID_GAIN_THRESHOLD = 1_000_000

  const {
    game,
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
    pointsPopupText,
    pointsPopupTone,
    pointsPopupId,
    snakeCells,
    foodKeys,
    purpleBonusKey,
    yellowBonusKey,
    pinkBonusKey,
    restartAction,
  } = useSnakeGame({ onRoundComplete })
  const [isHighScoreHypeActive, setIsHighScoreHypeActive] = useState(false)
  const [highScoreHypeKey, setHighScoreHypeKey] = useState(0)
  const previousScoreRef = useRef(game.score)
  const scoreEventsRef = useRef<Array<{ at: number; delta: number }>>([])
  const highScoreHypeTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const scoreDelta = game.score - previousScoreRef.current
    previousScoreRef.current = game.score
    if (scoreDelta <= 0) {
      return
    }

    const now = Date.now()
    scoreEventsRef.current.push({ at: now, delta: scoreDelta })
    scoreEventsRef.current = scoreEventsRef.current.filter(
      (event) => now - event.at <= RAPID_GAIN_WINDOW_MS
    )

    const rapidGain = scoreEventsRef.current.reduce((sum, event) => sum + event.delta, 0)
    if (rapidGain >= RAPID_GAIN_THRESHOLD) {
      setHighScoreHypeKey((current) => current + 1)
      setIsHighScoreHypeActive(true)
      if (highScoreHypeTimeoutRef.current !== null) {
        window.clearTimeout(highScoreHypeTimeoutRef.current)
      }
      highScoreHypeTimeoutRef.current = window.setTimeout(() => {
        setIsHighScoreHypeActive(false)
        highScoreHypeTimeoutRef.current = null
      }, 780)
      scoreEventsRef.current = []
    }
  }, [game.score])

  useEffect(() => {
    return () => {
      if (highScoreHypeTimeoutRef.current !== null) {
        window.clearTimeout(highScoreHypeTimeoutRef.current)
      }
    }
  }, [])
  const scoreToTopTenProgress =
    topTenCutoffScore !== null && topTenCutoffScore > 0
      ? Math.max(0, Math.min(1, game.score / topTenCutoffScore))
      : 0

  return (
    <section className="flex w-fit max-w-full flex-col gap-4 p-4 sm:p-6">
      <div className="mb-1">
        <SnakeHeader
          score={game.score}
          scoreToTopTenProgress={scoreToTopTenProgress}
          isHighScoreHypeActive={isHighScoreHypeActive}
          highScoreHypeKey={highScoreHypeKey}
        />
      </div>
      <div className="mb-3 sm:mb-4">
        <SnakeBoard
          width={game.width}
          height={game.height}
          status={game.status}
          onRestart={restartAction}
          foodKeys={foodKeys}
          snakeCells={snakeCells}
          purpleBonusKey={purpleBonusKey}
          yellowBonusKey={yellowBonusKey}
          pinkBonusKey={pinkBonusKey}
          boardEffect={boardEffect}
          isSpeedBoostActive={isSpeedBoostActive}
          isPurpleSlowMotionActive={isPurpleSlowMotionActive}
          isPermanentPointsBoostActive={isPermanentPointsBoostActive}
          isDiscoBurstActive={isDiscoBurstActive}
          discoBurstHue={discoBurstHue}
          discoHue={discoHue}
          yellowWaveActive={yellowWaveActive}
          yellowWaveExpanded={yellowWaveExpanded}
          areFoodsPurple={areFoodsPurple}
          eatParticleBursts={eatParticleBursts}
          pointsPopupText={pointsPopupText}
          pointsPopupTone={pointsPopupTone}
          pointsPopupId={pointsPopupId}
        />
      </div>
      <p className="text-center text-xs text-gray-400">
        Controls: Arrow keys or WASD to move, Space to pause/resume, R to restart.
      </p>
    </section>
  )
}
