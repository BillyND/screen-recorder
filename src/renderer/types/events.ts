/**
 * Recording event types for IPC communication
 * Used between preload and renderer process
 */

/** Recording started event */
export interface RecordingStartedEvent {
  type: 'recording:started'
  timestamp: number
}

/** Recording stopped event with final blob */
export interface RecordingStoppedEvent {
  type: 'recording:stopped'
  blob: Blob
  duration: number  // Total duration in seconds
}

/** Recording paused event */
export interface RecordingPausedEvent {
  type: 'recording:paused'
  timestamp: number
}

/** Recording resumed event */
export interface RecordingResumedEvent {
  type: 'recording:resumed'
  timestamp: number
}

/** Recording error event */
export interface RecordingErrorEvent {
  type: 'recording:error'
  error: string
  code?: string  // Error code for programmatic handling
}

/** Chunk available event (for chunked recording) */
export interface RecordingChunkEvent {
  type: 'recording:chunk'
  chunk: Blob
  totalSize: number  // Cumulative bytes
  chunkIndex: number
}

/** State change event */
export interface RecordingStateChangeEvent {
  type: 'recording:stateChange'
  status: 'idle' | 'recording' | 'paused' | 'stopping'
  duration: number
  fileSize: number
}

/** Union of all recording events */
export type RecordingEvent =
  | RecordingStartedEvent
  | RecordingStoppedEvent
  | RecordingPausedEvent
  | RecordingResumedEvent
  | RecordingErrorEvent
  | RecordingChunkEvent
  | RecordingStateChangeEvent

/** Event type string literals for type guards */
export type RecordingEventType = RecordingEvent['type']

/** Type guard for specific event types */
export function isRecordingEvent<T extends RecordingEventType>(
  event: RecordingEvent,
  type: T
): event is Extract<RecordingEvent, { type: T }> {
  return event.type === type
}
