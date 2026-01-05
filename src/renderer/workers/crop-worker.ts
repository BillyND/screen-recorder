/**
 * Crop Worker - Offloaded video frame processing
 * Uses MediaStreamTrackProcessor for real-time cropping
 */

/// <reference lib="webworker" />

// WebCodecs types - use generic interfaces to avoid conflicts with lib.dom.d.ts
interface ProcessorReadable {
  readable: ReadableStream<VideoFrame>
}

interface GeneratorWritable {
  writable: WritableStream<VideoFrame>
  track: MediaStreamTrack
}

// Access WebCodecs APIs dynamically to avoid type conflicts
const Processor = (globalThis as unknown as {
  MediaStreamTrackProcessor: new (init: { track: MediaStreamTrack }) => ProcessorReadable
}).MediaStreamTrackProcessor

const Generator = (globalThis as unknown as {
  MediaStreamTrackGenerator: new (init: { kind: string }) => GeneratorWritable
}).MediaStreamTrackGenerator

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface WorkerMessage {
  type: 'start' | 'stop' | 'updateRect'
  track?: MediaStreamTrack
  cropRect?: CropRect
}

interface WorkerResponse {
  type: 'track' | 'error' | 'stopped'
  track?: MediaStreamTrack
  error?: string
}

let processor: ProcessorReadable | null = null
let generator: GeneratorWritable | null = null
let abortController: AbortController | null = null
let currentCropRect: CropRect | null = null

/**
 * Handle messages from main thread
 */
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, track, cropRect } = e.data

  try {
    switch (type) {
      case 'start':
        if (track && cropRect) {
          await startCropping(track, cropRect)
        }
        break

      case 'updateRect':
        if (cropRect) {
          currentCropRect = cropRect
        }
        break

      case 'stop':
        stopCropping()
        break
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    postResponse({ type: 'error', error: errorMsg })
  }
}

/**
 * Start the cropping pipeline
 */
async function startCropping(
  inputTrack: MediaStreamTrack,
  cropRect: CropRect
): Promise<void> {
  // Cleanup any existing pipeline
  stopCropping()

  currentCropRect = cropRect
  abortController = new AbortController()

  // Create processor and generator
  processor = new Processor({ track: inputTrack })
  generator = new Generator({ kind: 'video' })

  // Send cropped track back to main thread (MediaStreamTrack not transferable)
  postResponse({ type: 'track', track: generator.track })

  // Create transform stream for cropping
  const transformer = new TransformStream<VideoFrame, VideoFrame>({
    transform(frame, controller) {
      try {
        if (!currentCropRect) {
          controller.enqueue(frame)
          return
        }

        // Clamp crop bounds to frame dimensions
        const validRect = {
          x: Math.max(0, Math.min(currentCropRect.x, frame.codedWidth - 1)),
          y: Math.max(0, Math.min(currentCropRect.y, frame.codedHeight - 1)),
          width: Math.min(
            currentCropRect.width,
            frame.codedWidth - currentCropRect.x
          ),
          height: Math.min(
            currentCropRect.height,
            frame.codedHeight - currentCropRect.y
          )
        }

        // Ensure minimum dimensions
        if (validRect.width <= 0 || validRect.height <= 0) {
          frame.close()
          return
        }

        // Create cropped frame using visibleRect (zero-copy when possible)
        const croppedFrame = new VideoFrame(frame, {
          visibleRect: validRect
        })

        controller.enqueue(croppedFrame)
      } catch (err) {
        console.error('Crop transform error:', err)
      } finally {
        // CRITICAL: Always close original frame to prevent memory leak
        frame.close()
      }
    }
  })

  // Run the pipeline
  processor.readable
    .pipeThrough(transformer)
    .pipeTo(generator.writable, { signal: abortController.signal })
    .catch((err) => {
      // AbortError is expected on stop
      if (err.name !== 'AbortError') {
        console.error('Crop pipeline error:', err)
        postResponse({ type: 'error', error: err.message })
      }
    })
}

/**
 * Stop the cropping pipeline
 */
function stopCropping(): void {
  // Abort the pipeline
  if (abortController) {
    abortController.abort()
    abortController = null
  }

  processor = null
  generator = null
  currentCropRect = null

  postResponse({ type: 'stopped' })
}

/**
 * Post response to main thread with optional transferables
 */
function postResponse(
  response: WorkerResponse,
  transfer?: Transferable[]
): void {
  if (transfer) {
    self.postMessage(response, transfer)
  } else {
    self.postMessage(response)
  }
}
