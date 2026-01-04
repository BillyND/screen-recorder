/**
 * Renderer API types - exposed via preload bridge
 * Defines the contract between preload and renderer
 */

import type { RecordingOptions, RecorderState, CaptureSource } from './recorder'
import type { RecordingEvent } from './events'

/**
 * RecorderAPI - exposed to renderer via window.recorderAPI
 * All methods are async to support IPC communication
 */
export interface RecorderAPI {
  // Recording control
  startRecording(options: RecordingOptions): Promise<void>
  stopRecording(): Promise<ArrayBuffer>  // ArrayBuffer for IPC serialization
  pauseRecording(): Promise<void>
  resumeRecording(): Promise<void>

  // State queries
  getState(): Promise<RecorderState>
  getSources(): Promise<CaptureSource[]>

  // Event subscription (returns cleanup function ID)
  onRecordingEvent(callback: (event: RecordingEvent) => void): () => void
}

/**
 * Extend Window interface for TypeScript
 * Matches preload contextBridge.exposeInMainWorld
 */
declare global {
  interface Window {
    recorderAPI: RecorderAPI
  }
}

/**
 * Type guard to check if recorderAPI is available
 */
export function isRecorderAPIAvailable(): boolean {
  return typeof window !== 'undefined' && 'recorderAPI' in window
}

/**
 * Get recorder API with runtime check
 * Throws if API not available (preload not loaded)
 */
export function getRecorderAPI(): RecorderAPI {
  if (!isRecorderAPIAvailable()) {
    throw new Error(
      'RecorderAPI not available. Ensure preload script is loaded correctly.'
    )
  }
  return window.recorderAPI
}
