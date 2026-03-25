import type { LeaderboardEntry } from '@/lib/leaderboard'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <aside className="h-full min-h-[32rem] w-full max-w-md bg-transparent p-2 md:min-h-[36rem]">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-gray-200">Leaderboard</h2>
      {entries.length === 0 ? (
        <div className="rounded bg-gray-800/80 px-4 py-3 text-sm text-gray-300">
          No scores yet. Finish a round to add one.
        </div>
      ) : (
        <ol className="space-y-2 text-lg text-gray-200">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className={`flex items-center justify-between rounded bg-gray-800/90 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] ${
                index === 0 ? 'snake-top-rank-glow' : ''
              }`}
            >
              <span className="text-gray-400">#{index + 1}</span>
              <span className="font-medium">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
