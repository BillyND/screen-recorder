/**
 * Conversion progress component
 * Shows progress bar and cancel button during format conversion
 */

import { Button } from './ui/button'
import { X, Check, AlertCircle } from 'lucide-react'
import type { ConversionStatus } from '../hooks/useConversion'
import type { OutputFormat } from '../types/settings'

interface Props {
  /** Current conversion status */
  status: ConversionStatus
  /** Progress percentage (0-100) */
  progress: number
  /** Error message if any */
  error: string | null
  /** Target format */
  format: OutputFormat
  /** Cancel callback */
  onCancel: () => void
  /** Done callback (after complete/error) */
  onDone: () => void
}

export function ConversionProgress({
  status,
  progress,
  error,
  format,
  onCancel,
  onDone
}: Props) {
  // Status labels
  const statusLabel = {
    idle: '',
    converting: 'Converting to ' + format.toUpperCase() + '...',
    complete: 'Conversion complete!',
    error: 'Conversion failed',
    cancelled: 'Conversion cancelled'
  }[status]

  // Show nothing if idle
  if (status === 'idle') return null

  return (
    <div className="p-4 border rounded-lg space-y-3">
      {/* Status text */}
      <div className="flex items-center gap-2">
        {status === 'complete' && <Check className="h-4 w-4 text-green-500" />}
        {status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
        <span className="text-sm font-medium">{statusLabel}</span>
      </div>

      {/* Progress bar */}
      {status === 'converting' && (
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all"
            style={{ width: progress + '%' }}
          />
        </div>
      )}

      {/* Progress percentage */}
      {status === 'converting' && (
        <div className="text-right text-xs text-muted-foreground">{progress}%</div>
      )}

      {/* Error message */}
      {status === 'error' && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {status === 'converting' && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}

        {(status === 'complete' || status === 'error' || status === 'cancelled') && (
          <Button size="sm" onClick={onDone}>
            {status === 'complete' ? 'Done' : 'Close'}
          </Button>
        )}
      </div>
    </div>
  )
}
