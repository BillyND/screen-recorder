/**
 * Stream Cropper Service
 * Real-time video cropping using Canvas (main thread)
 */

import type { CropArea } from '../types/recorder'
import { scaleAreaForDPI } from '../utils/dpi-utils'

/**
 * StreamCropper - Real-time video stream cropping using Canvas
 * Uses requestAnimationFrame for smooth frame processing
 */
export class StreamCropper {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private video: HTMLVideoElement | null = null
  private croppedStream: MediaStream | null = null
  private animationId: number | null = null
  private cropRect: CropArea | null = null
  private isRunning = false

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
    this.cropRect = await scaleAreaForDPI(logicalArea)

    // Get video track
    const videoTrack = inputStream.getVideoTracks()[0]
    if (!videoTrack) {
      throw new Error('No video track in stream')
    }

    // Create hidden video element to receive stream
    this.video = document.createElement('video')
    this.video.srcObject = new MediaStream([videoTrack])
    this.video.muted = true
    this.video.playsInline = true

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      this.video!.onloadedmetadata = () => {
        this.video!.play()
          .then(() => resolve())
          .catch(reject)
      }
      this.video!.onerror = () => reject(new Error('Video load failed'))
    })

    // Create canvas for cropping
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.cropRect.width
    this.canvas.height = this.cropRect.height
    this.ctx = this.canvas.getContext('2d')

    if (!this.ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Start the cropping loop
    this.isRunning = true
    this.renderFrame()

    // Capture stream from canvas (30 fps)
    const croppedVideoStream = this.canvas.captureStream(30)

    // Combine cropped video with original audio
    const audioTracks = inputStream.getAudioTracks()
    this.croppedStream = new MediaStream([
      ...croppedVideoStream.getVideoTracks(),
      ...audioTracks
    ])

    return this.croppedStream
  }

  /**
   * Render a single frame
   */
  private renderFrame = (): void => {
    if (!this.isRunning || !this.video || !this.ctx || !this.canvas || !this.cropRect) {
      return
    }

    // Draw cropped region to canvas
    this.ctx.drawImage(
      this.video,
      this.cropRect.x, this.cropRect.y,    // Source position
      this.cropRect.width, this.cropRect.height, // Source size
      0, 0,                                      // Dest position
      this.canvas.width, this.canvas.height     // Dest size
    )

    // Request next frame
    this.animationId = requestAnimationFrame(this.renderFrame)
  }

  /**
   * Update the crop area dynamically
   * @param logicalArea New area in logical pixels
   */
  async updateCropArea(logicalArea: CropArea): Promise<void> {
    this.cropRect = await scaleAreaForDPI(logicalArea)

    // Update canvas size if needed
    if (this.canvas && this.cropRect) {
      this.canvas.width = this.cropRect.width
      this.canvas.height = this.cropRect.height
    }
  }

  /**
   * Stop cropping and cleanup resources
   */
  stop(): void {
    this.isRunning = false

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    if (this.video) {
      this.video.pause()
      this.video.srcObject = null
      this.video = null
    }

    if (this.croppedStream) {
      this.croppedStream.getVideoTracks().forEach(t => t.stop())
      this.croppedStream = null
    }

    this.canvas = null
    this.ctx = null
    this.cropRect = null
  }

  /**
   * Check if cropper is active
   */
  isActive(): boolean {
    return this.isRunning
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
 * Check if area cropping is supported
 * Canvas-based cropping is always supported
 */
export function isAreaCropSupported(): boolean {
  return true
}
