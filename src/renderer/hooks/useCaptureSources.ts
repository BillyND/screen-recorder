/**
 * Hook for managing capture sources (screens and windows)
 */

import { useState, useEffect, useCallback } from 'react'
import type { CaptureSource } from '../types/recorder'

/** Return type for useCaptureSources hook */
export interface UseCaptureSources {
  /** List of available capture sources */
  sources: CaptureSource[]
  /** Loading state */
  loading: boolean
  /** Error message if load failed */
  error: string | null
  /** Refresh sources list */
  refresh: () => Promise<void>
  /** Screens only */
  screens: CaptureSource[]
  /** Windows only */
  windows: CaptureSource[]
}

/**
 * Hook to fetch and manage capture sources
 * Automatically loads on mount and provides refresh capability
 */
export function useCaptureSources(): UseCaptureSources {
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.sources.list()
      setSources(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  // Derived state - filter by type
  const screens = sources.filter(s => s.type === 'screen')
  const windows = sources.filter(s => s.type === 'window')

  return {
    sources,
    loading,
    error,
    refresh,
    screens,
    windows
  }
}
