/**
 * Core recorder types - platform-agnostic for future Tauri migration
 * No Electron imports allowed in this file
 */

/** Capture mode determines what to record */
export type CaptureMode = 'fullscreen' | 'window' | 'area'

/** Crop area for 'area' capture mode */
export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/** Options passed to startRecording */
export interface RecordingOptions {
  captureMode: CaptureMode
  windowId?: string             // Required for 'window' mode
  area?: CropArea               // Required for 'area' mode
  includeSystemAudio?: boolean  // Default: false
  includeMicrophone?: boolean   // Default: false
  videoBitsPerSecond?: number   // Default: 2500000 (2.5 Mbps)
  frameRate?: number            // Default: 30
}

/** Recorder status for UI binding */
export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopping'

/** Complete recorder state exposed to UI */
export interface RecorderState {
  status: RecorderStatus
  duration: number    // Seconds elapsed
  fileSize: number    // Bytes accumulated
  error?: string      // Error message if failed
}

/** Bounds for window/screen positioning */
export interface SourceBounds {
  x: number
  y: number
  width: number
  height: number
}

/** Capture source info (screen or window) */
export interface CaptureSource {
  id: string
  name: string
  thumbnail?: string  // Base64 data URL
  type: 'screen' | 'window'
  bounds?: SourceBounds  // Position and size on screen
}

/**
 * Recorder interface - platform-agnostic API
 * Implementations: ElectronRecorder (Phase 03), TauriRecorder (future)
 */
export interface IRecorder {
  // Core recording operations
  startRecording(options: RecordingOptions): Promise<void>
  stopRecording(): Promise<Blob>
  pauseRecording(): void
  resumeRecording(): void

  // State management
  getState(): RecorderState

  // Source discovery (screens and windows)
  getSources(): Promise<CaptureSource[]>

  // Event subscription (returns unsubscribe function)
  onStateChange(callback: (state: RecorderState) => void): () => void

  // Optional: chunked recording events (for memory management)
  onChunk?(callback: (chunk: Blob) => void): () => void
}

/** Default recording options */
export const DEFAULT_RECORDING_OPTIONS: Partial<RecordingOptions> = {
  includeSystemAudio: false,
  includeMicrophone: false,
  videoBitsPerSecond: 2500000, // 2.5 Mbps
  frameRate: 30
}

/** Initial recorder state */
export const INITIAL_RECORDER_STATE: RecorderState = {
  status: 'idle',
  duration: 0,
  fileSize: 0
}
