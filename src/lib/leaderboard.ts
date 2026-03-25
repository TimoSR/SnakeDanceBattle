export const HIGH_SCORE_KEY = 'snake-high-score'
export const LEADERBOARD_KEY = 'snake-leaderboard'
export const LEADERBOARD_LIMIT = 10

export interface LeaderboardEntry {
  id: string
  score: number
}

export function parseStoredHighScore(value: string | null): number {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed
  }
  return 0
}

export function parseStoredLeaderboard(value: string | null): LeaderboardEntry[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as LeaderboardEntry[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(
        (entry) =>
          typeof entry?.id === 'string' &&
          typeof entry?.score === 'number' &&
          Number.isFinite(entry.score) &&
          entry.score >= 0
      )
      .slice(0, LEADERBOARD_LIMIT)
  } catch {
    return []
  }
}

export function nextLeaderboard(entries: LeaderboardEntry[], score: number): LeaderboardEntry[] {
  return [...entries, { id: `${Date.now()}-${Math.random()}`, score }]
    .sort((a, b) => b.score - a.score)
    .slice(0, LEADERBOARD_LIMIT)
}
