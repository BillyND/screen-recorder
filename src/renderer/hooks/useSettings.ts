/**
 * Settings hook for managing app configuration
 */

import { useState, useEffect, useCallback } from 'react'
import type { AppSettings, OutputFormat, Resolution, FPS } from '../types/settings'

/** Default settings (fallback if API unavailable) */
const DEFAULT_SETTINGS: AppSettings = {
  saveLocation: '',
  resolution: 'original',
  fps: 30,
  outputFormat: 'mp4',
  includeAudio: true
}

/** Settings hook return type */
interface UseSettingsReturn {
  settings: AppSettings
  loading: boolean
  error: string | null
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  pickSaveLocation: () => Promise<string | null>
  setResolution: (resolution: Resolution) => Promise<void>
  setFPS: (fps: FPS) => Promise<void>
  setOutputFormat: (format: OutputFormat) => Promise<void>
  setIncludeAudio: (include: boolean) => Promise<void>
}

/**
 * Hook for managing app settings
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (!window.api?.settings) {
          throw new Error('Settings API not available')
        }
        const loaded = await window.api.settings.getAll()
        setSettings(loaded)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Update a single setting
  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> => {
    try {
      if (!window.api?.settings) {
        throw new Error('Settings API not available')
      }
      await window.api.settings.set(key, value)
      setSettings(prev => ({ ...prev, [key]: value }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting')
      throw err
    }
  }, [])

  // Pick save location
  const pickSaveLocation = useCallback(async (): Promise<string | null> => {
    try {
      if (!window.api?.settings) {
        throw new Error('Settings API not available')
      }
      const location = await window.api.settings.pickLocation()
      if (location) {
        setSettings(prev => ({ ...prev, saveLocation: location }))
      }
      return location
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick location')
      return null
    }
  }, [])

  // Convenience setters
  const setResolution = useCallback(
    (resolution: Resolution) => updateSetting('resolution', resolution),
    [updateSetting]
  )

  const setFPS = useCallback(
    (fps: FPS) => updateSetting('fps', fps),
    [updateSetting]
  )

  const setOutputFormat = useCallback(
    (format: OutputFormat) => updateSetting('outputFormat', format),
    [updateSetting]
  )

  const setIncludeAudio = useCallback(
    (include: boolean) => updateSetting('includeAudio', include),
    [updateSetting]
  )

  return {
    settings,
    loading,
    error,
    updateSetting,
    pickSaveLocation,
    setResolution,
    setFPS,
    setOutputFormat,
    setIncludeAudio
  }
}
