interface SnakeHeaderProps {
  score: number
  highScore: number
  scoreToTopTenProgress: number
  isHighScoreHypeActive: boolean
  highScoreHypeKey: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function mixChannel(from: number, to: number, progress: number): number {
  return Math.round(from + (to - from) * clamp(progress, 0, 1))
}

export default function SnakeHeader({
  score,
  highScore: _highScore,
  scoreToTopTenProgress: _scoreToTopTenProgress,
  isHighScoreHypeActive,
  highScoreHypeKey,
}: SnakeHeaderProps) {
  const HUNDREDS_THRESHOLD = 100
  const MILLIONS_THRESHOLD = 1_000_000
  const BILLIONS_THRESHOLD = 1_000_000_000
  const hasBillionEnergy = score >= BILLIONS_THRESHOLD

  let red = 229
  let green = 231
  let blue = 235

  if (score >= BILLIONS_THRESHOLD) {
    red = 216
    green = 180
    blue = 255
  } else if (score >= MILLIONS_THRESHOLD) {
    const millionToBillionProgress = clamp(
      (Math.log10(Math.max(MILLIONS_THRESHOLD, score)) - 6) / 3,
      0,
      1
    )
    red = mixChannel(249, 239, millionToBillionProgress)
    green = mixChannel(115, 68, millionToBillionProgress)
    blue = mixChannel(22, 68, millionToBillionProgress)
  } else if (score >= HUNDREDS_THRESHOLD) {
    const hundredToMillionProgress = clamp(
      (Math.log10(Math.max(HUNDREDS_THRESHOLD, score)) - 2) / 4,
      0,
      1
    )
    red = mixChannel(229, 251, hundredToMillionProgress)
    green = mixChannel(231, 191, hundredToMillionProgress)
    blue = mixChannel(235, 36, hundredToMillionProgress)
  }

  const scoreColor = `rgb(${red} ${green} ${blue})`

  return (
    <header className="flex w-full items-center justify-start font-mono font-bold uppercase tracking-wider text-gray-200">
      <div
        key={highScoreHypeKey}
        className={`text-left drop-shadow-[0_0_8px_rgba(248,250,252,0.25)] ${
          isHighScoreHypeActive ? 'snake-highscore-hype text-amber-300' : ''
        } ${hasBillionEnergy ? 'snake-billion-energy' : ''}`}
      >
        <span className="text-2xl text-gray-400 sm:text-3xl">Score</span>{' '}
        <span className="text-3xl leading-none sm:text-4xl" style={{ color: scoreColor }}>
          {score}
        </span>
      </div>
    </header>
  )
}
