/**
 * Source picker component
 * Displays available screens and windows with thumbnails
 */

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
    <div className="source-picker">
      <div className="source-picker__header">
        <h3>Select Source</h3>
        <button
          className="source-picker__refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {screens.length > 0 && (
        <section className="source-picker__section">
          <h4>Screens</h4>
          <div className="source-picker__grid">
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
        <section className="source-picker__section">
          <h4>Windows</h4>
          <div className="source-picker__grid">
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
        <p className="source-picker__empty">No sources available</p>
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
      className={`source-card ${selected ? 'source-card--selected' : ''}`}
      onClick={onSelect}
    >
      {source.thumbnail ? (
        <img
          src={source.thumbnail}
          alt={source.name}
          className="source-card__thumbnail"
        />
      ) : (
        <div className="source-card__placeholder" />
      )}
      <span className="source-card__name" title={source.name}>
        {source.name}
      </span>
    </button>
  )
}
