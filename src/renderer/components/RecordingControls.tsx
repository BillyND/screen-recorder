/**
 * Recording controls component
 * Start, stop, pause, and resume buttons
 */

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
      <div className="recording-controls">
        <button
          className="recording-controls__btn recording-controls__btn--start"
          onClick={onStart}
          disabled={disabled}
        >
          <span className="recording-controls__icon">●</span>
          Start Recording
        </button>
      </div>
    )
  }

  // Recording - show pause and stop buttons
  return (
    <div className="recording-controls recording-controls--active">
      <button
        className={`recording-controls__btn recording-controls__btn--pause ${isPaused ? 'recording-controls__btn--paused' : ''}`}
        onClick={isPaused ? onResume : onPause}
      >
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>
      <button
        className="recording-controls__btn recording-controls__btn--stop"
        onClick={onStop}
      >
        ■ Stop
      </button>
    </div>
  )
}
