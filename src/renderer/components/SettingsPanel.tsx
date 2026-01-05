/**
 * Settings panel component
 * Configure save location, resolution, FPS, and output format
 */

import { useSettings } from '../hooks/useSettings'
import { Button } from './ui/button'
import { RESOLUTION_LABELS, FPS_OPTIONS, FORMAT_LABELS } from '../types/settings'
import type { Resolution, FPS, OutputFormat } from '../types/settings'

interface Props {
  isOpen: boolean
  disabled?: boolean
}

export function SettingsPanel({ isOpen, disabled }: Props) {
  const {
    settings,
    loading,
    pickSaveLocation,
    setResolution,
    setFPS,
    setOutputFormat,
    setIncludeAudio
  } = useSettings()

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="p-4 border-b">
        <div className="text-center text-muted-foreground text-sm">Loading settings...</div>
      </div>
    )
  }

  const displayPath = settings.saveLocation.length > 40
    ? '...' + settings.saveLocation.slice(-37)
    : settings.saveLocation

  return (
    <div className="p-4 border-b space-y-4">
      {/* Save Location */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Save Location
        </label>
        <div className="flex gap-2">
          <span
            className="flex-1 px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground truncate"
            title={settings.saveLocation}
          >
            {displayPath}
          </span>
          <Button variant="outline" size="sm" onClick={pickSaveLocation} disabled={disabled}>
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
          className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          value={settings.outputFormat}
          onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
          disabled={disabled}
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
          className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          value={settings.resolution}
          onChange={(e) => setResolution(e.target.value as Resolution)}
          disabled={disabled}
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
          className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          value={settings.fps}
          onChange={(e) => setFPS(Number(e.target.value) as FPS)}
          disabled={disabled}
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
          disabled={disabled}
        />
        <label htmlFor="include-audio" className="text-sm cursor-pointer">
          Include system audio
        </label>
      </div>
    </div>
  )
}
