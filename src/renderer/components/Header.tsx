/**
 * Header component with window controls and settings
 */

import { memo, useCallback } from "react"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Minus, Square, X, Settings, Sun, Moon } from "lucide-react"
import { useSettings } from "../hooks/useSettings"
import { useTheme } from "../hooks/useTheme"
import { RESOLUTION_LABELS, FPS_OPTIONS, FORMAT_LABELS } from "../types/settings"
import type { Resolution, FPS, OutputFormat } from "../types/settings"

interface HeaderProps {
  isRecording?: boolean
}

export const Header = memo(function Header({ isRecording = false }: HeaderProps) {
  const {
    settings,
    loading,
    pickSaveLocation,
    setResolution,
    setFPS,
    setOutputFormat,
    setIncludeAudio
  } = useSettings()

  const { toggleTheme, isDark } = useTheme()

  const handleMinimize = useCallback(() => {
    window.api?.window?.minimize?.()
  }, [])

  const handleMaximize = useCallback(() => {
    window.api?.window?.maximize?.()
  }, [])

  const handleClose = useCallback(() => {
    window.api?.window?.close?.()
  }, [])

  const displayPath = settings.saveLocation.length > 30
    ? '...' + settings.saveLocation.slice(-27)
    : settings.saveLocation

  return (
    <header className="draggable flex items-center justify-between px-3 py-2 border-b bg-background">
      <div className="flex items-center gap-2">
        <span className="text-lg">⏺</span>
        <span className="text-sm font-medium">Screen Recorder</span>
      </div>

      <div className="non-draggable flex items-center gap-1">
        {/* Theme Toggle */}
        <Button
          onClick={toggleTheme}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>

        {/* Settings Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Settings"
              disabled={isRecording}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            {loading ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                Loading settings...
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Settings</h4>

                {/* Save Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Save Location
                  </label>
                  <div className="flex gap-2">
                    <span
                      className="flex-1 px-2 py-1.5 bg-muted rounded text-xs text-muted-foreground truncate"
                      title={settings.saveLocation}
                    >
                      {displayPath}
                    </span>
                    <Button variant="outline" size="sm" onClick={pickSaveLocation} disabled={isRecording}>
                      Browse
                    </Button>
                  </div>
                </div>

                {/* Output Format */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Output Format
                  </label>
                  <select
                    className="w-full px-2 py-1.5 bg-background border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    value={settings.outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                    disabled={isRecording}
                  >
                    {(Object.entries(FORMAT_LABELS) as [OutputFormat, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Resolution */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Resolution
                  </label>
                  <select
                    className="w-full px-2 py-1.5 bg-background border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    value={settings.resolution}
                    onChange={(e) => setResolution(e.target.value as Resolution)}
                    disabled={isRecording}
                  >
                    {(Object.entries(RESOLUTION_LABELS) as [Resolution, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* FPS */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Frame Rate
                  </label>
                  <select
                    className="w-full px-2 py-1.5 bg-background border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    value={settings.fps}
                    onChange={(e) => setFPS(Number(e.target.value) as FPS)}
                    disabled={isRecording}
                  >
                    {FPS_OPTIONS.map((fps) => (
                      <option key={fps} value={fps}>{fps} fps</option>
                    ))}
                  </select>
                </div>

                {/* Audio Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-audio"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={settings.includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    disabled={isRecording}
                  />
                  <label htmlFor="include-audio" className="text-sm cursor-pointer">
                    Include system audio
                  </label>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Window controls */}
        <Button
          onClick={handleMinimize}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          onClick={handleMaximize}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Maximize"
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  )
})
