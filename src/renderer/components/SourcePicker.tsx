/**
 * Source picker component
 * Displays available screens and windows with thumbnails
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { RefreshCw, Monitor, AppWindow } from 'lucide-react'
import type { CaptureSource } from '../types/recorder'

interface Props {
  /** List of available sources */
  sources: CaptureSource[]
  /** Currently selected source ID */
  selectedId: string | null
  /** Callback when source is selected */
  onSelect: (source: CaptureSource) => void
  /** Callback to refresh sources */
  onRefresh: () => void
  /** Whether sources are loading */
  loading?: boolean
}

export function SourcePicker({
  sources,
  selectedId,
  onSelect,
  onRefresh,
  loading
}: Props) {
  const screens = sources.filter(s => s.type === 'screen')
  const windows = sources.filter(s => s.type === 'window')

  // Show highlight when source is selected
  const handleSelect = useCallback((source: CaptureSource) => {
    console.log('[SourcePicker] Selected source:', source.name, 'bounds:', source.bounds)

    // First call parent's onSelect
    onSelect(source)

    // Show highlight overlay if source has bounds
    if (source.bounds) {
      console.log('[SourcePicker] Calling highlight.show with bounds:', source.bounds)
      window.api?.highlight?.show(source.bounds)
    } else {
      console.log('[SourcePicker] No bounds available for this source')
    }
  }, [onSelect])

  // Hide highlight when component unmounts or sources change
  useEffect(() => {
    return () => {
      window.api?.highlight?.hide()
    }
  }, [])

  return (
    <div className="flex-1 overflow-auto p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Select Source</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {screens.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Screens</h4>
          <div className="grid grid-cols-2 gap-2">
            {screens.map(source => (
              <SourceCard
                key={source.id}
                source={source}
                selected={source.id === selectedId}
                onSelect={() => handleSelect(source)}
              />
            ))}
          </div>
        </section>
      )}

      {windows.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Windows</h4>
          <div className="grid grid-cols-2 gap-2">
            {windows.map(source => (
              <SourceCard
                key={source.id}
                source={source}
                selected={source.id === selectedId}
                onSelect={() => handleSelect(source)}
              />
            ))}
          </div>
        </section>
      )}

      {sources.length === 0 && !loading && (
        <p className="text-center text-sm text-muted-foreground py-4">No sources available</p>
      )}
    </div>
  )
}

/** Individual source card with thumbnail */
function SourceCard({
  source,
  selected,
  onSelect
}: {
  source: CaptureSource
  selected: boolean
  onSelect: () => void
}) {
  const [imageError, setImageError] = useState(false)

  /** Get icon based on source type */
  const SourceIcon = source.type === 'screen' ? Monitor : AppWindow

  // Check if we have a thumbnail to display
  const hasThumbnailData = Boolean(source.thumbnail && source.thumbnail.length > 50)

  return (
    <button
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all duration-200 ${
        selected
          ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-400/30 shadow-md dark:bg-yellow-900/20'
          : 'border-border hover:border-yellow-300 hover:bg-muted/50 hover:shadow-sm'
      }`}
      onClick={onSelect}
      type="button"
      aria-pressed={selected}
      aria-label={`Select ${source.name}`}
    >
      <div className="relative w-full h-20 overflow-hidden rounded bg-muted">
        {hasThumbnailData && !imageError ? (
          <img
            src={source.thumbnail}
            alt={source.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <SourceIcon className="h-6 w-6 text-muted-foreground/70" />
            <span className="text-[10px] text-muted-foreground">
              {imageError ? 'Preview failed' : 'No preview'}
            </span>
          </div>
        )}
      </div>
      <span
        className="text-xs font-medium truncate w-full text-center leading-tight"
        title={source.name}
      >
        {source.name}
      </span>
    </button>
  )
}
