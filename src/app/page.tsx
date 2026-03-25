'use client'

import { useCallback, useEffect, useState } from 'react'
import Leaderboard from '@/components/Leaderboard'
import SnakeGame from '@/components/SnakeGame'
import {
  HIGH_SCORE_KEY,
  LEADERBOARD_KEY,
  LEADERBOARD_LIMIT,
  type LeaderboardEntry,
  nextLeaderboard,
  parseStoredHighScore,
  parseStoredLeaderboard,
} from '@/lib/leaderboard'

export default function Home() {
  const [highScore, setHighScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    setHighScore(parseStoredHighScore(window.localStorage.getItem(HIGH_SCORE_KEY)))
    setLeaderboard(parseStoredLeaderboard(window.localStorage.getItem(LEADERBOARD_KEY)))
  }, [])

  const handleRoundComplete = useCallback((score: number) => {
    if (score > highScore) {
      setHighScore(score)
      window.localStorage.setItem(HIGH_SCORE_KEY, String(score))
    }

    const updatedLeaderboard = nextLeaderboard(leaderboard, score)

    setLeaderboard(updatedLeaderboard)
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedLeaderboard))
  }, [highScore, leaderboard])
  const topTenCutoffScore =
    leaderboard.length >= LEADERBOARD_LIMIT ? leaderboard[leaderboard.length - 1]?.score ?? null : null

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid min-h-[calc(100vh-3rem)] w-full grid-cols-[1fr_2fr_1fr] items-start gap-4 sm:min-h-[calc(100vh-4rem)]">
        <div />
        <div className="flex justify-center py-6 sm:py-8">
          <SnakeGame
            topTenCutoffScore={topTenCutoffScore}
            highScore={highScore}
            onRoundComplete={handleRoundComplete}
          />
        </div>
        <div className="flex items-stretch justify-start py-10 sm:py-14">
          <Leaderboard entries={leaderboard} />
        </div>
      </div>
    </main>
  )
}
