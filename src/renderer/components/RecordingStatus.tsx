/**
 * Recording status display component
 * Shows duration and file size during recording
 */

import { formatDuration, formatFileSize } from '../hooks/useRecordingTimer'
import type { RecorderState } from '../types/recorder'

interface Props {
  /** Current recorder state */
  state: RecorderState
  /** Whether currently recording */
  isRecording: boolean
  /** Whether recording is paused */
  isPaused: boolean
}

export function RecordingStatus({ state, isRecording, isPaused }: Props) {
  if (!isRecording && state.status === 'idle') {
    return null
  }

  return (
    <div className={`flex flex-col items-center gap-2 p-4 ${isPaused ? 'opacity-75' : ''}`}>
      <div className="flex items-center gap-2">
        {isRecording && !isPaused && (
          <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse-recording" />
        )}
        {isPaused && (
          <span className="h-3 w-3 rounded-full bg-orange-500" />
        )}
        {state.status === 'stopping' && (
          <span className="text-sm text-muted-foreground">Stopping...</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="font-mono text-lg">
          {formatDuration(state.duration)}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">
          {formatFileSize(state.fileSize)}
        </span>
      </div>

      {isPaused && (
        <span className="text-xs font-medium text-orange-500 uppercase tracking-wide">PAUSED</span>
      )}
    </div>
  )
}
