/**
 * Real-time screen preview component
 * Shows live preview of fullscreen or selected area
 */

import { useEffect, useRef, useState } from 'react'
import { Monitor, Maximize2 } from 'lucide-react'
import type { CropArea } from '../types/recorder'

interface Props {
  /** Preview mode */
  mode: 'fullscreen' | 'area'
  /** Selected area for area mode */
  area?: CropArea | null
  /** Whether preview is active */
  active?: boolean
}

export function ScreenPreview({ mode, area, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Start/stop screen capture
  useEffect(() => {
    if (!active) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
      return
    }

    let mounted = true

    const startCapture = async () => {
      try {
        // Get primary screen source
        const sources = await window.api?.sources?.list()
        const screenSource = sources?.find((s: { type: string }) => s.type === 'screen')

        if (!screenSource) {
          setError('No screen found')
          return
        }

        // Request screen capture with constraints
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // @ts-expect-error - Electron-specific constraint
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: screenSource.id,
              minWidth: 320,
              maxWidth: 1920,
              minHeight: 180,
              maxHeight: 1080,
              minFrameRate: 5,
              maxFrameRate: 15
            }
          }
        })

        if (mounted) {
          setStream(mediaStream)
          setError(null)
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
          }
        } else {
          mediaStream.getTracks().forEach(track => track.stop())
        }
      } catch (err) {
        console.error('[ScreenPreview] Failed to start capture:', err)
        if (mounted) {
          setError('Preview unavailable')
        }
      }
    }

    startCapture()

    return () => {
      mounted = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [active])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Area mode without selection - show placeholder
  if (mode === 'area' && !area) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-muted/30">
        <Maximize2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Click REC to select an area</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-muted/30">
        <Monitor className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  // Calculate crop style for area mode
  const getCropStyle = (): React.CSSProperties => {
    if (mode !== 'area' || !area) return {}

    // Get screen dimensions from the video
    const videoWidth = videoRef.current?.videoWidth || 1920
    const videoHeight = videoRef.current?.videoHeight || 1080

    // Calculate scale to fit the preview container
    const scaleX = 100 / (area.width / videoWidth * 100)
    const scaleY = 100 / (area.height / videoHeight * 100)
    const scale = Math.min(scaleX, scaleY)

    // Calculate offset to center the area
    const offsetX = -(area.x / videoWidth) * 100 * scale
    const offsetY = -(area.y / videoHeight) * 100 * scale

    return {
      transform: `scale(${scale}) translate(${offsetX}%, ${offsetY}%)`,
      transformOrigin: 'top left'
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-2 bg-muted/30 overflow-hidden">
      <div className="relative w-full h-full max-h-[200px] rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
          style={mode === 'area' && area ? getCropStyle() : undefined}
        />
        {/* Mode indicator */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white/80">
          {mode === 'fullscreen' ? 'Full Screen' : `Area ${area?.width}×${area?.height}`}
        </div>
      </div>
    </div>
  )
}
