/**
 * Recording controls component
 * Start, stop, pause, and resume buttons
 */

import { Button } from './ui/button'
import { Circle, Square, Pause, Play } from 'lucide-react'

interface Props {
  /** Whether currently recording */
  isRecording: boolean
  /** Whether recording is paused */
  isPaused: boolean
  /** Start recording callback */
  onStart: () => void
  /** Stop recording callback */
  onStop: () => void
  /** Pause recording callback */
  onPause: () => void
  /** Resume recording callback */
  onResume: () => void
  /** Whether controls are disabled */
  disabled?: boolean
}

export function RecordingControls({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled
}: Props) {
  // Not recording - show start button
  if (!isRecording) {
    return (
      <div className="flex gap-2 justify-center">
        <Button
          onClick={onStart}
          disabled={disabled}
          className="bg-red-500 hover:bg-red-600 text-white px-6"
        >
          <Circle className="h-4 w-4 mr-2 fill-current" />
          Start Recording
        </Button>
      </div>
    )
  }

  // Recording - show pause and stop buttons
  return (
    <div className="flex gap-2 justify-center">
      <Button
        variant={isPaused ? 'default' : 'outline'}
        onClick={isPaused ? onResume : onPause}
      >
        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </Button>
      <Button
        variant="destructive"
        onClick={onStop}
        className="px-6"
      >
        <Square className="h-4 w-4 mr-2 fill-current" />
        Stop
      </Button>
    </div>
  )
}
