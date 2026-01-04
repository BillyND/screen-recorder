/**
 * Electron Recorder - IRecorder implementation for Electron
 * Uses MediaRecorder API with desktopCapturer
 */

import type {
  IRecorder,
  RecordingOptions,
  RecorderState,
  CaptureSource
} from '../types/recorder'
import { INITIAL_RECORDER_STATE } from '../types/recorder'
import { getSupportedMimeType } from '../utils/codec-utils'
import { createMixedAudioTrack, cleanupMixer } from '../utils/audio-mixer'
import { StreamCropper, isAreaCropSupported } from './stream-cropper'

/** Chunk interval for ondataavailable (5 seconds) */
const CHUNK_INTERVAL_MS = 5000

/** Max blob size before flush (100MB) */
const MAX_BLOB_SIZE = 100 * 1024 * 1024

/**
 * ElectronRecorder - Screen recording using Electron's desktopCapturer
 */
export class ElectronRecorder implements IRecorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private totalSize = 0
  private state: RecorderState = { ...INITIAL_RECORDER_STATE }
  private stateListeners = new Set<(state: RecorderState) => void>()
  private chunkListeners = new Set<(chunk: Blob) => void>()
  private startTime = 0
  private pausedDuration = 0
  private pauseStartTime = 0
  private durationInterval: number | null = null
  private cropper: StreamCropper | null = null

  /**
   * Get available capture sources (screens and windows)
   */
  async getSources(): Promise<CaptureSource[]> {
    return window.api.sources.list()
  }

  /**
   * Start recording with specified options
   */
  async startRecording(options: RecordingOptions): Promise<void> {
    if (this.state.status !== 'idle') {
      throw new Error('Recording already in progress')
    }

    const sourceId = await this.resolveSourceId(options)

    // Get video stream via getUserMedia (Electron's desktopCapturer pattern)
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxFrameRate: options.frameRate ?? 30
        }
      } as MediaTrackConstraints,
      audio: options.includeSystemAudio ? {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      } as MediaTrackConstraints : false
    })

    // Mix audio if microphone requested
    if (options.includeMicrophone) {
      const mixedAudio = await createMixedAudioTrack(
        this.stream,
        true
      )
      if (mixedAudio) {
        // Remove existing audio track and add mixed one
        this.stream.getAudioTracks().forEach(t => this.stream?.removeTrack(t))
        this.stream.addTrack(mixedAudio)
      }
    }

    // Apply area cropping if requested
    if (options.captureMode === 'area' && options.area) {
      if (!isAreaCropSupported()) {
        throw new Error('Area capture not supported in this browser')
      }
      this.cropper = new StreamCropper()
      this.stream = await this.cropper.crop(this.stream, options.area)
    }

    // Create MediaRecorder with best available codec
    const mimeType = getSupportedMimeType()
    this.recorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond ?? 2500000
    })

    this.setupRecorderEvents()
    this.recorder.start(CHUNK_INTERVAL_MS)
    this.startDurationTimer()
    this.updateState({ status: 'recording', duration: 0, fileSize: 0, error: undefined })
  }

  /**
   * Stop recording and return the recorded blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.state.status === 'idle') {
        resolve(new Blob())
        return
      }

      this.updateState({ status: 'stopping' })

      const recorder = this.recorder
      const mimeType = recorder.mimeType ?? 'video/webm'
      const originalOnStop = recorder.onstop

      recorder.onstop = (event) => {
        try {
          const blob = new Blob(this.chunks, { type: mimeType })
          this.updateState({ ...INITIAL_RECORDER_STATE })
          resolve(blob)
        } catch (err) {
          reject(err)
        } finally {
          // Always cleanup resources
          this.cleanup()
          // Call original if exists
          originalOnStop?.call(recorder, event)
        }
      }

      this.recorder.stop()
    })
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.pause()
      this.pauseStartTime = Date.now()
      this.stopDurationTimer()
      this.updateState({ status: 'paused' })
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.recorder?.state === 'paused') {
      this.pausedDuration += Date.now() - this.pauseStartTime
      this.recorder.resume()
      this.startDurationTimer()
      this.updateState({ status: 'recording' })
    }
  }

  /**
   * Get current recorder state
   */
  getState(): RecorderState {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  onStateChange(callback: (state: RecorderState) => void): () => void {
    this.stateListeners.add(callback)
    // Immediately call with current state
    callback(this.state)
    return () => this.stateListeners.delete(callback)
  }

  /**
   * Subscribe to chunk events (for memory management)
   * @returns Unsubscribe function
   */
  onChunk(callback: (chunk: Blob) => void): () => void {
    this.chunkListeners.add(callback)
    return () => this.chunkListeners.delete(callback)
  }

  /**
   * Setup MediaRecorder event handlers
   */
  private setupRecorderEvents(): void {
    if (!this.recorder) return

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data)
        this.totalSize += event.data.size
        this.updateState({ fileSize: this.totalSize })

        // Notify chunk listeners
        this.chunkListeners.forEach(cb => cb(event.data))

        // Flush chunks to prevent memory bloat
        if (this.totalSize > MAX_BLOB_SIZE) {
          this.flushChunks()
        }
      }
    }

    this.recorder.onerror = (event) => {
      console.error('MediaRecorder error:', event)
      this.updateState({
        error: 'Recording error occurred',
        status: 'idle'
      })
      this.cleanup()
    }
  }

  /**
   * Resolve source ID based on capture mode
   */
  private async resolveSourceId(options: RecordingOptions): Promise<string> {
    if (options.captureMode === 'window' && options.windowId) {
      return options.windowId
    }

    // For fullscreen or area mode, use primary screen
    const sources = await this.getSources()
    const screen = sources.find(s => s.type === 'screen')
    if (!screen) {
      throw new Error('No screen sources available')
    }
    return screen.id
  }

  /**
   * Update state and notify listeners
   */
  private updateState(partial: Partial<RecorderState>): void {
    this.state = { ...this.state, ...partial }
    this.stateListeners.forEach(cb => cb(this.state))
  }

  /**
   * Start duration timer
   */
  private startDurationTimer(): void {
    if (this.startTime === 0) {
      this.startTime = Date.now()
    }
    this.durationInterval = window.setInterval(() => {
      const elapsed = Date.now() - this.startTime - this.pausedDuration
      const duration = Math.floor(elapsed / 1000)
      this.updateState({ duration })
    }, 1000)
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer(): void {
    if (this.durationInterval !== null) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }
  }

  /**
   * Flush chunks to prevent memory bloat
   * In a full implementation, would save to IndexedDB or filesystem
   */
  private flushChunks(): void {
    console.log(`Flushing ${this.totalSize} bytes (${this.chunks.length} chunks)`)
    // For MVP, we keep chunks in memory
    // Full impl would save to IndexedDB and clear array
  }

  /**
   * Cleanup all resources
   */
  private cleanup(): void {
    this.stopDurationTimer()
    this.chunks = []
    this.totalSize = 0
    this.startTime = 0
    this.pausedDuration = 0
    this.pauseStartTime = 0

    // Stop cropper if active
    if (this.cropper) {
      this.cropper.stop()
      this.cropper = null
    }

    // Stop all stream tracks
    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null
    this.recorder = null

    // Cleanup audio mixer
    cleanupMixer()
  }
}

/** Singleton instance for use throughout the app */
let recorderInstance: ElectronRecorder | null = null

/**
 * Get the singleton recorder instance
 */
export function getRecorder(): ElectronRecorder {
  if (!recorderInstance) {
    recorderInstance = new ElectronRecorder()
  }
  return recorderInstance
}
