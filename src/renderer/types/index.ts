// Type definitions for screen-recorder
// Will be populated in Phase 02

export interface RecordingOptions {
  captureMode: 'fullscreen' | 'window' | 'area'
  windowId?: string
  area?: {
    x: number
    y: number
    width: number
    height: number
  }
  includeSystemAudio?: boolean
  includeMicrophone?: boolean
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'

export interface RecorderStatus {
  state: RecordingState
  duration: number
  fileSize: number
}
