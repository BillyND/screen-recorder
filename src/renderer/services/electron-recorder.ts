/**
 * Electron Recorder - Simple screen/area capture
 */

import type { IRecorder, RecordingOptions, RecorderState, CaptureSource } from '../types/recorder'
import { INITIAL_RECORDER_STATE } from '../types/recorder'
import { getSupportedMimeType } from '../utils/codec-utils'
import { createMixedAudioTrack, cleanupMixer } from '../utils/audio-mixer'
import { StreamCropper, isAreaCropSupported } from './stream-cropper'

const CHUNK_INTERVAL_MS = 5000
const MAX_BLOB_SIZE = 100 * 1024 * 1024

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

  async getSources(): Promise<CaptureSource[]> {
    return window.api.sources.list()
  }

  async startRecording(options: RecordingOptions): Promise<void> {
    if (this.state.status !== 'idle') {
      throw new Error('Recording already in progress')
    }

    // Get primary screen source
    const sources = await this.getSources()
    const screen = sources.find(s => s.type === 'screen')
    if (!screen) {
      throw new Error('No screen available')
    }

    // Get video stream
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screen.id,
            maxFrameRate: options.frameRate ?? 30
          }
        } as MediaTrackConstraints,
        audio: options.includeSystemAudio ? {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screen.id
          }
        } as MediaTrackConstraints : false
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'NotReadableError') {
        throw new Error('Could not start screen capture. Please try again.')
      }
      throw error
    }

    // Mix microphone if requested
    if (options.includeMicrophone) {
      const mixedAudio = await createMixedAudioTrack(this.stream, true)
      if (mixedAudio) {
        this.stream.getAudioTracks().forEach(t => this.stream?.removeTrack(t))
        this.stream.addTrack(mixedAudio)
      }
    }

    // Apply area cropping
    if (options.captureMode === 'area' && options.area) {
      if (!isAreaCropSupported()) {
        throw new Error('Area capture not supported')
      }
      this.cropper = new StreamCropper()
      this.stream = await this.cropper.crop(this.stream, options.area)
    }

    // Create recorder
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

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.state.status === 'idle') {
        resolve(new Blob())
        return
      }

      this.updateState({ status: 'stopping' })
      const recorder = this.recorder
      const mimeType = recorder.mimeType ?? 'video/webm'

      recorder.onstop = () => {
        try {
          const blob = new Blob(this.chunks, { type: mimeType })
          this.updateState({ ...INITIAL_RECORDER_STATE })
          resolve(blob)
        } catch (err) {
          reject(err)
        } finally {
          this.cleanup()
        }
      }

      this.recorder.stop()
    })
  }

  pauseRecording(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.pause()
      this.pauseStartTime = Date.now()
      this.stopDurationTimer()
      this.updateState({ status: 'paused' })
    }
  }

  resumeRecording(): void {
    if (this.recorder?.state === 'paused') {
      this.pausedDuration += Date.now() - this.pauseStartTime
      this.recorder.resume()
      this.startDurationTimer()
      this.updateState({ status: 'recording' })
    }
  }

  getState(): RecorderState {
    return { ...this.state }
  }

  onStateChange(callback: (state: RecorderState) => void): () => void {
    this.stateListeners.add(callback)
    callback(this.state)
    return () => this.stateListeners.delete(callback)
  }

  onChunk(callback: (chunk: Blob) => void): () => void {
    this.chunkListeners.add(callback)
    return () => this.chunkListeners.delete(callback)
  }

  private setupRecorderEvents(): void {
    if (!this.recorder) return

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data)
        this.totalSize += event.data.size
        this.updateState({ fileSize: this.totalSize })
        this.chunkListeners.forEach(cb => cb(event.data))

        if (this.totalSize > MAX_BLOB_SIZE) {
          this.flushChunks()
        }
      }
    }

    this.recorder.onerror = () => {
      this.updateState({ error: 'Recording error', status: 'idle' })
      this.cleanup()
    }
  }

  private updateState(partial: Partial<RecorderState>): void {
    this.state = { ...this.state, ...partial }
    this.stateListeners.forEach(cb => cb(this.state))
  }

  private startDurationTimer(): void {
    if (this.startTime === 0) this.startTime = Date.now()
    this.durationInterval = window.setInterval(() => {
      const elapsed = Date.now() - this.startTime - this.pausedDuration
      this.updateState({ duration: Math.floor(elapsed / 1000) })
    }, 1000)
  }

  private stopDurationTimer(): void {
    if (this.durationInterval !== null) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }
  }

  private flushChunks(): void {
    // Keep in memory for MVP
  }

  private cleanup(): void {
    this.stopDurationTimer()
    this.chunks = []
    this.totalSize = 0
    this.startTime = 0
    this.pausedDuration = 0
    this.pauseStartTime = 0

    if (this.cropper) {
      this.cropper.stop()
      this.cropper = null
    }

    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null
    this.recorder = null
    cleanupMixer()
  }
}

let recorderInstance: ElectronRecorder | null = null
export function getRecorder(): ElectronRecorder {
  if (!recorderInstance) recorderInstance = new ElectronRecorder()
  return recorderInstance
}
