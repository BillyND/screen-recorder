/**
 * Type definitions barrel file
 * Re-exports all types for convenient imports
 */

// Core recorder types
export type {
  CaptureMode,
  CropArea,
  RecordingOptions,
  RecorderStatus,
  RecorderState,
  CaptureSource,
  IRecorder
} from './recorder'

export {
  DEFAULT_RECORDING_OPTIONS,
  INITIAL_RECORDER_STATE
} from './recorder'

// Recording event types
export type {
  RecordingStartedEvent,
  RecordingStoppedEvent,
  RecordingPausedEvent,
  RecordingResumedEvent,
  RecordingErrorEvent,
  RecordingChunkEvent,
  RecordingStateChangeEvent,
  RecordingEvent,
  RecordingEventType
} from './events'

export { isRecordingEvent } from './events'

// API types (preload bridge)
export type { RecorderAPI } from './api'

export {
  isRecorderAPIAvailable,
  getRecorderAPI
} from './api'
