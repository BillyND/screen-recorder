/**
 * Hook for managing video conversion
 */

import { useState, useEffect, useCallback } from 'react'
import type { OutputFormat, Resolution, FPS } from '../types/settings'

/** Conversion status */
export type ConversionStatus = 'idle' | 'converting' | 'complete' | 'error' | 'cancelled'

/** Conversion hook return type */
export interface UseConversionReturn {
  status: ConversionStatus
  progress: number
  error: string | null
  convert: (
    inputPath: string,
    outputPath: string,
    format: OutputFormat,
    options: { resolution: Resolution; fps: FPS }
  ) => Promise<boolean>
  cancel: () => Promise<void>
  reset: () => void
}

/**
 * Hook for video format conversion
 */
export function useConversion(): UseConversionReturn {
  const [status, setStatus] = useState<ConversionStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to progress updates
  useEffect(() => {
    if (!window.api?.ffmpeg) return

    const listenerId = window.api.ffmpeg.onProgress((percent) => {
      setProgress(percent)
    })

    return () => {
      window.api.ffmpeg.removeProgressListener(listenerId)
    }
  }, [])

  // Convert video
  const convert = useCallback(async (
    inputPath: string,
    outputPath: string,
    format: OutputFormat,
    options: { resolution: Resolution; fps: FPS }
  ): Promise<boolean> => {
    if (!window.api?.ffmpeg) {
      setError('FFmpeg API not available')
      setStatus('error')
      return false
    }

    try {
      setStatus('converting')
      setProgress(0)
      setError(null)

      const result = await window.api.ffmpeg.convert(inputPath, outputPath, format, options)

      if (result.success) {
        setStatus('complete')
        setProgress(100)
        return true
      } else {
        setError(result.error || 'Conversion failed')
        setStatus('error')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setStatus('error')
      return false
    }
  }, [])

  // Cancel conversion
  const cancel = useCallback(async () => {
    if (!window.api?.ffmpeg) return

    try {
      await window.api.ffmpeg.cancel()
      setStatus('cancelled')
    } catch (err) {
      console.error('Failed to cancel conversion:', err)
    }
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
  }, [])

  return {
    status,
    progress,
    error,
    convert,
    cancel,
    reset
  }
}
