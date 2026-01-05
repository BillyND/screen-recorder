/**
 * Capture mode selector component
 * Allows switching between fullscreen, window, and area modes
 */

import { Monitor, AppWindow, Maximize2 } from 'lucide-react'
import type { CaptureMode } from '../types/recorder'

/** Mode configuration */
interface ModeConfig {
  value: CaptureMode
  label: string
  description: string
  Icon: typeof Monitor
}

const MODES: ModeConfig[] = [
  { value: 'fullscreen', label: 'Full Screen', description: 'Capture entire display', Icon: Monitor },
  { value: 'window', label: 'Window', description: 'Capture specific window', Icon: AppWindow },
  { value: 'area', label: 'Area', description: 'Select region to capture', Icon: Maximize2 }
]

interface Props {
  /** Currently selected mode */
  value: CaptureMode
  /** Callback when mode changes */
  onChange: (mode: CaptureMode) => void
  /** Whether selector is disabled */
  disabled?: boolean
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capture Mode</h3>
      <div className="flex border rounded-lg overflow-hidden">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 text-sm transition-colors ${value === mode.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => onChange(mode.value)}
            disabled={disabled}
            title={mode.description}
          >
            <mode.Icon className="h-4 w-4" />
            <span className="text-xs">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
