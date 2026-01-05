/**
 * Screen Recorder - Clean UI with Tailwind
 */

import { useState, useEffect } from "react";
import { useScreenRecorder } from "../hooks/useScreenRecorder";
import { useSettings } from "../hooks/useSettings";
import { Header } from "./Header";
import { Button } from "./ui/button";
import { SourcePicker } from "./SourcePicker";
import { AreaOverlay } from "./AreaOverlay";
import { ScreenPreview } from "./ScreenPreview";
import type { CaptureMode, CropArea, CaptureSource } from "../types/recorder";
import { formatDuration, formatFileSize } from "../hooks/useRecordingTimer";
import {
  Circle,
  Square,
  Pause,
  Play,
  Camera,
  Monitor,
  Maximize2,
  Volume2,
  Mic,
} from "lucide-react";

/** Recording mode with icon */
const MODES: { id: CaptureMode; label: string; Icon: typeof Monitor }[] = [
  { id: "window", label: "Screen", Icon: Monitor },
  { id: "area", label: "Area", Icon: Maximize2 },
];

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
    clearError,
  } = useScreenRecorder();

  const { settings } = useSettings();

  // Local UI state
  const [mode, setMode] = useState<CaptureMode>("window");
  const [selectedSource, setSelectedSource] = useState<CaptureSource | null>(
    null
  );
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [selectedArea, setSelectedArea] = useState<CropArea | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);

  // Simulate audio levels
  useEffect(() => {
    if (!isRecording) {
      setMicLevel(0);
      setSpeakerLevel(0);
      return;
    }

    const interval = setInterval(() => {
      setMicLevel(Math.random() * 80 + 10);
      setSpeakerLevel(Math.random() * 70 + 20);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle mode change
  const handleModeChange = (newMode: CaptureMode) => {
    if (isRecording) return;
    setMode(newMode);
    setSelectedSource(null);
    setSelectedArea(null);
  };

  // Handle start recording
  const handleStart = async () => {
    if (mode === "area") {
      // Use already selected area or prompt for new one
      const area = selectedArea || (await window.api?.areaSelector?.show());
      if (area) {
        setSelectedArea(area);
        await startRecording({
          captureMode: "area",
          area,
          includeSystemAudio: settings.includeAudio,
        });
      }
      return;
    }

    // Screen/window mode - use selected source
    if (!selectedSource) return;

    // Determine capture mode based on source type
    const captureMode = selectedSource.type === "screen" ? "fullscreen" : "window";

    await startRecording({
      captureMode,
      windowId: selectedSource.id,
      includeSystemAudio: settings.includeAudio,
    });
  };

  // Handle selecting area for preview (without recording)
  const handleSelectArea = async () => {
    const area = await window.api?.areaSelector?.show();
    if (area) {
      setSelectedArea(area);
    }
  };

  // Handle area selection (legacy - from overlay)
  const handleAreaSelect = async (area: CropArea) => {
    setShowAreaSelector(false);
    setSelectedArea(area);
    await startRecording({
      captureMode: "area",
      area,
      includeSystemAudio: settings.includeAudio,
    });
  };

  // Handle stop
  const handleStop = async () => {
    const blob = await stopRecording();
    if (!blob || blob.size === 0) {
      console.error("No recording data to save");
      return;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `recording-${timestamp}.webm`;

    // Save to configured saveLocation via IPC
    try {
      const result = await window.api.video.save(blob, filename);
      if (result.success && result.path) {
        console.log("Video saved successfully to:", result.path);
        // Open the folder containing the saved file
        await window.api.shell.showItemInFolder(result.path);
      } else {
        console.error("Failed to save video:", result.error);
      }
    } catch (err) {
      console.error("Error saving video:", err);
    }
  };

  // Can start check - require source selection for screen mode
  const canStart = isIdle && (mode === "area" || selectedSource !== null);

  // Show area overlay
  if (showAreaSelector) {
    return (
      <AreaOverlay
        onSelect={handleAreaSelect}
        onCancel={() => setShowAreaSelector(false)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header isRecording={isRecording} />

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-3 py-2 bg-destructive/10 border-b border-destructive text-destructive text-sm">
          <span>{error}</span>
          <button onClick={clearError} className="hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex border-b">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-sm transition-colors
              ${
                mode === m.id
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
              ${
                isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }
            `}
            onClick={() => handleModeChange(m.id)}
            disabled={isRecording}
          >
            <m.Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Source picker for screen mode */}
      {mode === "window" && !isRecording && (
        <SourcePicker
          sources={sources}
          selectedId={selectedSource?.id ?? null}
          onSelect={setSelectedSource}
          onRefresh={refreshSources}
          loading={sourcesLoading}
        />
      )}

      {/* Live preview - only show when recording */}
      {isRecording && mode === "window" && selectedSource && (
        <ScreenPreview
          mode="source"
          sourceId={selectedSource.id}
          active={true}
        />
      )}
      {isRecording && mode === "area" && (
        <ScreenPreview
          mode="area"
          area={selectedArea}
          active={true}
        />
      )}

      {/* Recording stats - show below preview when recording */}
      {isRecording && (
        <div className="flex items-center justify-center gap-6 px-4 py-2 border-t bg-muted/30">
          {/* Recording indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`text-lg ${
                isPaused
                  ? "text-orange-500"
                  : "text-red-500 animate-pulse-recording"
              }`}
            >
              ●
            </span>
            <span className="text-sm font-bold">
              {isPaused ? "PAUSED" : "REC"}
            </span>
          </div>
          {/* Duration */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Time:</span>
            <span className="text-sm font-mono">
              {formatDuration(state.duration)}
            </span>
          </div>
          {/* Size */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Size:</span>
            <span className="text-sm font-mono">
              {formatFileSize(state.fileSize)}
            </span>
          </div>
        </div>
      )}

      {/* Volume meters */}
      <div className="flex gap-4 px-4 py-2 border-t">
        <div className="flex-1 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full meter-fill rounded-full transition-all"
              style={{ width: `${speakerLevel}%` }}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Mic className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full meter-fill rounded-full transition-all"
              style={{ width: `${micLevel}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex gap-2 justify-center p-4 border-t">
        {!isRecording ? (
          <>
            {/* Select Area button for area mode */}
            {mode === "area" && (
              <Button variant="outline" onClick={handleSelectArea}>
                <Maximize2 className="h-4 w-4 mr-2" />
                {selectedArea ? "Reselect" : "Select Area"}
              </Button>
            )}
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
              variant={isPaused ? "default" : "outline"}
              onClick={isPaused ? resumeRecording : pauseRecording}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <Button variant="destructive" onClick={handleStop} className="px-6">
              <Square className="h-4 w-4 mr-2 fill-current" />
              STOP
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
