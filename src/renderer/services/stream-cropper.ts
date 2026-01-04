/**
 * Stream Cropper Service
 * Manages crop worker lifecycle and stream handling
 */

import type { CropArea } from '../types/recorder'
import { scaleAreaForDPI } from '../utils/dpi-utils'

/** Worker initialization timeout */
const WORKER_TIMEOUT_MS = 5000

/** Worker response types */
interface WorkerResponse {
  type: 'track' | 'error' | 'stopped'
  track?: MediaStreamTrack
  error?: string
}

/**
 * StreamCropper - Real-time video stream cropping via Web Worker
 */
export class StreamCropper {
  private worker: Worker | null = null
  private croppedStream: MediaStream | null = null

  /**
   * Crop a video stream to the specified area
   * @param inputStream Stream to crop
   * @param logicalArea Area in logical (CSS) pixels
   * @returns New stream with cropped video + original audio
   */
  async crop(
    inputStream: MediaStream,
    logicalArea: CropArea
  ): Promise<MediaStream> {
    // Scale for display DPI
    const scaledArea = await scaleAreaForDPI(logicalArea)

    // Get video track to crop
    const videoTrack = inputStream.getVideoTracks()[0]
    if (!videoTrack) {
      throw new Error('No video track in stream')
    }

    // Create worker
    this.worker = new Worker(
      new URL('../workers/crop-worker.ts', import.meta.url),
      { type: 'module' }
    )

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cleanup()
        reject(new Error('Crop worker initialization timeout'))
      }, WORKER_TIMEOUT_MS)

      this.worker!.onmessage = (e: MessageEvent<WorkerResponse>) => {
        switch (e.data.type) {
          case 'track':
            if (e.data.track) {
              clearTimeout(timeout)

              // Create new stream with cropped video + original audio
              const audioTracks = inputStream.getAudioTracks()
              this.croppedStream = new MediaStream([
                e.data.track,
                ...audioTracks
              ])

              resolve(this.croppedStream)
            }
            break

          case 'error':
            clearTimeout(timeout)
            this.cleanup()
            reject(new Error(e.data.error ?? 'Crop worker error'))
            break

          case 'stopped':
            // Worker stopped - handled by cleanup
            break
        }
      }

      this.worker!.onerror = (err) => {
        clearTimeout(timeout)
        this.cleanup()
        reject(new Error(`Crop worker error: ${err.message}`))
      }

      // Send track to worker with transfer
      this.worker!.postMessage(
        {
          type: 'start',
          track: videoTrack,
          cropRect: scaledArea
        },
        [videoTrack]
      )
    })
  }

  /**
   * Update the crop area dynamically
   * @param logicalArea New area in logical pixels
   */
  async updateCropArea(logicalArea: CropArea): Promise<void> {
    if (!this.worker) {
      throw new Error('Cropper not initialized')
    }

    const scaledArea = await scaleAreaForDPI(logicalArea)
    this.worker.postMessage({
      type: 'updateRect',
      cropRect: scaledArea
    })
  }

  /**
   * Stop cropping and cleanup resources
   */
  stop(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' })
      this.worker.terminate()
      this.worker = null
    }

    // Stop cropped stream tracks (but not original audio)
    if (this.croppedStream) {
      this.croppedStream.getVideoTracks().forEach(t => t.stop())
      this.croppedStream = null
    }
  }

  /**
   * Internal cleanup on error
   */
  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.croppedStream = null
  }

  /**
   * Check if cropper is active
   */
  isActive(): boolean {
    return this.worker !== null
  }
}

/** Singleton instance */
let cropperInstance: StreamCropper | null = null

/**
 * Get singleton cropper instance
 */
export function getCropper(): StreamCropper {
  if (!cropperInstance) {
    cropperInstance = new StreamCropper()
  }
  return cropperInstance
}

/**
 * Check if MediaStreamTrackProcessor is supported
 * Required for area cropping feature
 */
export function isAreaCropSupported(): boolean {
  return typeof (globalThis as unknown as { MediaStreamTrackProcessor?: unknown })
    .MediaStreamTrackProcessor !== 'undefined'
}
