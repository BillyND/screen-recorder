/**
 * Screen Recorder - Clean UI with Tailwind
 * Similar to focus-reminder design
 */

import { useState, useEffect } from 'react'
import { useScreenRecorder } from '../hooks/useScreenRecorder'
import { useSettings } from '../hooks/useSettings'
import { Header } from './Header'
import { Button } from './ui/button'
import { SourcePicker } from './SourcePicker'
import { AreaOverlay } from './AreaOverlay'
import { SettingsPanel } from './SettingsPanel'
import type { CaptureMode, CropArea, CaptureSource } from '../types/recorder'
import { formatDuration, formatFileSize } from '../hooks/useRecordingTimer'
import { Circle, Square, Pause, Play, Camera, Settings, Monitor, AppWindow, Maximize2, Volume2, Mic } from 'lucide-react'

/** Recording mode with icon */
const MODES: { id: CaptureMode; label: string; Icon: typeof Monitor }[] = [
  { id: 'fullscreen', label: 'Full Screen', Icon: Monitor },
  { id: 'window', label: 'Window', Icon: AppWindow },
  { id: 'area', label: 'Area', Icon: Maximize2 }
]

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

  const { settings } = useSettings()

  // Local UI state
  const [mode, setMode] = useState<CaptureMode>('fullscreen')
  const [selectedSource, setSelectedSource] = useState<CaptureSource | null>(null)
  const [showAreaSelector, setShowAreaSelector] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [speakerLevel, setSpeakerLevel] = useState(0)

  // Simulate audio levels
  useEffect(() => {
    if (!isRecording) {
      setMicLevel(0)
      setSpeakerLevel(0)
      return
    }

    const interval = setInterval(() => {
      setMicLevel(Math.random() * 80 + 10)
      setSpeakerLevel(Math.random() * 70 + 20)
    }, 100)

    return () => clearInterval(interval)
  }, [isRecording])

  // Handle mode change
  const handleModeChange = (newMode: CaptureMode) => {
    if (isRecording) return
    setMode(newMode)
    setSelectedSource(null)
  }

  // Handle start recording
  const handleStart = async () => {
    if (mode === 'area') {
      const area = await window.api?.areaSelector?.show(); if (area) { await startRecording({ captureMode: 'area', area, includeSystemAudio: settings.includeAudio }); }
      return
    }

    await startRecording({
      captureMode: mode,
      windowId: mode === 'window' ? selectedSource?.id : undefined,
      includeSystemAudio: settings.includeAudio
    })
  }

  // Handle area selection
  const handleAreaSelect = async (area: CropArea) => {
    setShowAreaSelector(false)
    await startRecording({
      captureMode: 'area',
      area,
      includeSystemAudio: settings.includeAudio
    })
  }

  // Handle stop
  const handleStop = async () => {
    const blob = await stopRecording()
    if (!blob || blob.size === 0) return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `recording-${timestamp}.webm`

    // Save to configured saveLocation via IPC
    const result = await window.api.video.save(blob, filename)
    if (!result.success) {
      console.error('Failed to save video:', result.error)
    }
  }

  // Can start check
  const canStart = isIdle && (mode !== 'window' || selectedSource !== null)

  // Show area overlay
  if (showAreaSelector) {
    return (
      <AreaOverlay
        onSelect={handleAreaSelect}
        onCancel={() => setShowAreaSelector(false)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header />

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-3 py-2 bg-destructive/10 border-b border-destructive text-destructive text-sm">
          <span>{error}</span>
          <button onClick={clearError} className="hover:opacity-70">✕</button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex border-b">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-sm transition-colors
              ${mode === m.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
              ${isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => handleModeChange(m.id)}
            disabled={isRecording}
          >
            <m.Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Settings panel toggle */}
      <div className="flex items-center justify-end px-3 py-2 border-b">
        <Button
          variant={showSettings ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          disabled={isRecording}
        >
          <Settings className="h-4 w-4 mr-1" />
          Settings
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && <SettingsPanel isOpen={showSettings} disabled={isRecording} />}

      {/* Source picker for window mode */}
      {mode === 'window' && !isRecording && !showSettings && (
        <SourcePicker
          sources={sources}
          selectedId={selectedSource?.id ?? null}
          onSelect={setSelectedSource}
          onRefresh={refreshSources}
          loading={sourcesLoading}
        />
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
        {isRecording ? (
          <div className="flex flex-col items-center gap-4">
            {/* Recording indicator */}
            <div className="flex items-center gap-2">
              <span className={`text-2xl ${isPaused ? 'text-orange-500' : 'text-red-500 animate-pulse-recording'}`}>●</span>
              <span className="text-lg font-bold">{isPaused ? 'PAUSED' : 'REC'}</span>
            </div>

            {/* Stats */}
            <div className="flex gap-8 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="text-lg font-mono">{formatDuration(state.duration)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Size</div>
                <div className="text-lg font-mono">{formatFileSize(state.fileSize)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            {mode === 'fullscreen' && <Monitor className="h-12 w-12 text-muted-foreground" />}
            {mode === 'window' && <AppWindow className="h-12 w-12 text-muted-foreground" />}
            {mode === 'area' && <Maximize2 className="h-12 w-12 text-muted-foreground" />}
            <p className="text-sm text-muted-foreground">
              {mode === 'fullscreen' && 'Ready to record full screen'}
              {mode === 'window' && (selectedSource ? `Recording: ${selectedSource.name}` : 'Select a window to record')}
              {mode === 'area' && 'Click REC to select area'}
            </p>
          </div>
        )}
      </main>

      {/* Volume meters */}
      <div className="flex gap-4 px-4 py-2 border-t">
        <div className="flex-1 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full meter-fill rounded-full transition-all" style={{ width: `${speakerLevel}%` }} />
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Mic className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full meter-fill rounded-full transition-all" style={{ width: `${micLevel}%` }} />
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex gap-2 justify-center p-4 border-t">
        {!isRecording ? (
          <>
            <Button
              onClick={handleStart}
              disabled={!canStart}
              className="bg-red-500 hover:bg-red-600 text-white px-6"
            >
              <Circle className="h-4 w-4 mr-2 fill-current" />
              REC
            </Button>
            <Button variant="outline" disabled>
              <Camera className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isPaused ? 'default' : 'outline'}
              onClick={isPaused ? resumeRecording : pauseRecording}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              variant="destructive"
              onClick={handleStop}
              className="px-6"
            >
              <Square className="h-4 w-4 mr-2 fill-current" />
              STOP
            </Button>
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t text-xs text-muted-foreground">
        <span>{settings.outputFormat.toUpperCase()}</span>
        <span>|</span>
        <span>{settings.resolution === 'original' ? 'Original' : settings.resolution}</span>
        <span>|</span>
        <span>{settings.fps} FPS</span>
        <span>|</span>
        <span>{settings.includeAudio ? 'Audio ON' : 'Audio OFF'}</span>
      </div>
    </div>
  )
}
