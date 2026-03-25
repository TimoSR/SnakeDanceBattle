interface SnakeHeaderProps {
  score: number
  scoreToTopTenProgress: number
  isHighScoreHypeActive: boolean
  highScoreHypeKey: number
}

export default function SnakeHeader({
  score,
  scoreToTopTenProgress,
  isHighScoreHypeActive,
  highScoreHypeKey,
}: SnakeHeaderProps) {
  const progress = Math.max(0, Math.min(1, scoreToTopTenProgress))
  const red = Math.round(229 + (248 - 229) * progress)
  const green = Math.round(231 + (113 - 231) * progress)
  const blue = Math.round(235 + (113 - 235) * progress)
  const scoreColor = `rgb(${red} ${green} ${blue})`

  return (
    <header className="flex w-full items-center justify-start font-mono font-bold uppercase tracking-wider text-gray-200">
      <div
        key={highScoreHypeKey}
        className={`text-left drop-shadow-[0_0_8px_rgba(248,250,252,0.25)] ${
          isHighScoreHypeActive ? 'snake-highscore-hype text-amber-300' : ''
        }`}
      >
        <span className="text-2xl text-gray-400 sm:text-3xl">Score</span>{' '}
        <span className="text-3xl leading-none sm:text-4xl" style={{ color: scoreColor }}>
          {score}
        </span>
      </div>
    </header>
  )
}
