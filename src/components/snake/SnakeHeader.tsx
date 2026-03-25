interface SnakeHeaderProps {
  score: number
  highScore: number
  scoreToTopTenProgress: number
  isHighScoreHypeActive: boolean
  highScoreHypeKey: number
}

export default function SnakeHeader({
  score,
  highScore,
  scoreToTopTenProgress,
  isHighScoreHypeActive,
  highScoreHypeKey,
}: SnakeHeaderProps) {
  const progress = Math.max(0, Math.min(1, scoreToTopTenProgress))
  const isAboveHighScore = score > highScore
  const epicProgress =
    isAboveHighScore && highScore >= 0
      ? Math.max(0, Math.min(1, (score - highScore) / Math.max(100, highScore * 0.35)))
      : 0

  const baseRed = Math.round(229 + (248 - 229) * progress)
  const baseGreen = Math.round(231 + (113 - 231) * progress)
  const baseBlue = Math.round(235 + (113 - 235) * progress)

  const red = Math.round(baseRed + (204 - baseRed) * epicProgress)
  const green = Math.round(baseGreen + (153 - baseGreen) * epicProgress)
  const blue = Math.round(baseBlue + (255 - baseBlue) * epicProgress)
  const scoreColor = `rgb(${red} ${green} ${blue})`

  return (
    <header className="flex w-full items-center justify-start font-mono font-bold uppercase tracking-wider text-gray-200">
      <div
        key={highScoreHypeKey}
        className={`text-left drop-shadow-[0_0_8px_rgba(248,250,252,0.25)] ${
          isHighScoreHypeActive ? 'snake-highscore-hype text-amber-300' : ''
        }`}
        style={
          isAboveHighScore
            ? {
                textShadow: `0 0 ${8 + epicProgress * 18}px rgba(216,180,255,0.95)`,
                boxShadow: `0 0 ${14 + epicProgress * 20}px rgba(255,255,255,0.62), inset 0 0 ${
                  8 + epicProgress * 12
                }px rgba(255,255,255,0.22)`,
                borderRadius: '0.35rem',
                paddingInline: '0.35rem',
              }
            : undefined
        }
      >
        <span className="text-2xl text-gray-400 sm:text-3xl">Score</span>{' '}
        <span className="text-3xl leading-none sm:text-4xl" style={{ color: scoreColor }}>
          {score}
        </span>
      </div>
    </header>
  )
}
