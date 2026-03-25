import type { GameStatus } from '@/lib/snake'

interface SnakeControlsProps {
  status: GameStatus
  onTogglePause: () => void
  onRestart: () => void
}

export default function SnakeControls({ status, onTogglePause, onRestart }: SnakeControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={status === 'gameOver'}
        onClick={onTogglePause}
        className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:text-gray-600"
      >
        {status === 'paused' ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
      >
        Restart
      </button>
    </div>
  )
}
