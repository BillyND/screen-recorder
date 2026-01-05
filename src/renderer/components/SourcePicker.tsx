/**
 * Source picker component
 * Displays available screens and windows with thumbnails
 */

import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
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
                onSelect={() => onSelect(source)}
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
                onSelect={() => onSelect(source)}
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
  return (
    <button
      className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-colors ${selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
      onClick={onSelect}
    >
      {source.thumbnail ? (
        <img
          src={source.thumbnail}
          alt={source.name}
          className="w-full h-16 object-cover rounded"
        />
      ) : (
        <div className="w-full h-16 bg-muted rounded flex items-center justify-center">
          <span className="text-xs text-muted-foreground">No preview</span>
        </div>
      )}
      <span className="text-xs truncate w-full text-center" title={source.name}>
        {source.name}
      </span>
    </button>
  )
}
