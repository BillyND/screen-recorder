/**
 * Capture mode selector component
 * Allows switching between fullscreen, window, and area modes
 */

import type { CaptureMode } from '../types/recorder'

/** Mode configuration */
interface ModeConfig {
  value: CaptureMode
  label: string
  description: string
}

const MODES: ModeConfig[] = [
  {
    value: 'fullscreen',
    label: 'Full Screen',
    description: 'Capture entire display'
  },
  {
    value: 'window',
    label: 'Window',
    description: 'Capture specific window'
  },
  {
    value: 'area',
    label: 'Area',
    description: 'Select region to capture'
  }
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
    <div className="mode-selector">
      <h3 className="mode-selector__title">Capture Mode</h3>
      <div className="mode-selector__buttons">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            className={`mode-selector__btn ${value === mode.value ? 'mode-selector__btn--active' : ''}`}
            onClick={() => onChange(mode.value)}
            disabled={disabled}
            title={mode.description}
          >
            <span className="mode-selector__label">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
