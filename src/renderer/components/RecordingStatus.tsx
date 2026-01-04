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
    <div className={`recording-status ${isPaused ? 'recording-status--paused' : ''}`}>
      <div className="recording-status__indicator">
        {isRecording && !isPaused && (
          <span className="recording-status__dot recording-status__dot--recording" />
        )}
        {isPaused && (
          <span className="recording-status__dot recording-status__dot--paused" />
        )}
        {state.status === 'stopping' && (
          <span className="recording-status__text">Stopping...</span>
        )}
      </div>

      <div className="recording-status__info">
        <span className="recording-status__duration">
          {formatDuration(state.duration)}
        </span>
        <span className="recording-status__separator">|</span>
        <span className="recording-status__size">
          {formatFileSize(state.fileSize)}
        </span>
      </div>

      {isPaused && (
        <span className="recording-status__paused-label">PAUSED</span>
      )}
    </div>
  )
}
