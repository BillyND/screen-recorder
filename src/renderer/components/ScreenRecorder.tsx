/**
 * Main screen recorder component
 * Container that orchestrates all recording UI
 */

import { useState } from 'react'
import { useScreenRecorder } from '../hooks/useScreenRecorder'
import { ModeSelector } from './ModeSelector'
import { SourcePicker } from './SourcePicker'
import { AreaOverlay } from './AreaOverlay'
import { RecordingControls } from './RecordingControls'
import { RecordingStatus } from './RecordingStatus'
import type { CaptureMode, CropArea, CaptureSource } from '../types/recorder'

export function ScreenRecorder() {
  const {
    state,
    isRecording,
    isPaused,
    isIdle,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    sources,
    refreshSources,
    sourcesLoading,
    error,
    clearError
  } = useScreenRecorder()

  // Local UI state
  const [mode, setMode] = useState<CaptureMode>('fullscreen')
  const [selectedSource, setSelectedSource] = useState<CaptureSource | null>(null)
  const [showAreaSelector, setShowAreaSelector] = useState(false)
  const [includeAudio, setIncludeAudio] = useState(true)

  // Handle start recording
  const handleStart = async () => {
    // For area mode, show overlay first
    if (mode === 'area') {
      setShowAreaSelector(true)
      return
    }

    // Start recording with current settings
    await startRecording({
      captureMode: mode,
      windowId: mode === 'window' ? selectedSource?.id : undefined,
      includeSystemAudio: includeAudio
    })
  }

  // Handle area selection complete
  const handleAreaSelect = async (area: CropArea) => {
    setShowAreaSelector(false)

    await startRecording({
      captureMode: 'area',
      area,
      includeSystemAudio: includeAudio
    })
  }

  // Handle stop and download
  const handleStop = async () => {
    const blob = await stopRecording()
    if (blob && blob.size > 0) {
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recording-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  // Check if start is disabled
  const canStart = isIdle && (mode !== 'window' || selectedSource !== null)

  // Show area overlay if selecting
  if (showAreaSelector) {
    return (
      <AreaOverlay
        onSelect={handleAreaSelect}
        onCancel={() => setShowAreaSelector(false)}
      />
    )
  }

  return (
    <div className="screen-recorder">
      <h1 className="screen-recorder__title">Screen Recorder</h1>

      {/* Error banner */}
      {error && (
        <div className="screen-recorder__error">
          <span>{error}</span>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      {/* Mode selection - disabled during recording */}
      <ModeSelector
        value={mode}
        onChange={setMode}
        disabled={isRecording}
      />

      {/* Source picker - only for window mode when not recording */}
      {mode === 'window' && !isRecording && (
        <SourcePicker
          sources={sources}
          selectedId={selectedSource?.id ?? null}
          onSelect={setSelectedSource}
          onRefresh={refreshSources}
          loading={sourcesLoading}
        />
      )}

      {/* Audio toggle - disabled during recording */}
      {!isRecording && (
        <label className="screen-recorder__audio-toggle">
          <input
            type="checkbox"
            checked={includeAudio}
            onChange={(e) => setIncludeAudio(e.target.checked)}
          />
          Include system audio
        </label>
      )}

      {/* Recording status */}
      <RecordingStatus
        state={state}
        isRecording={isRecording}
        isPaused={isPaused}
      />

      {/* Recording controls */}
      <RecordingControls
        isRecording={isRecording}
        isPaused={isPaused}
        onStart={handleStart}
        onStop={handleStop}
        onPause={pauseRecording}
        onResume={resumeRecording}
        disabled={!canStart}
      />
    </div>
  )
}
