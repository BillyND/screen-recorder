/**
 * Main screen recorder hook
 * Wraps ElectronRecorder service with React state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  RecordingOptions,
  RecorderState,
  CaptureSource,
  IRecorder
} from '../types/recorder'
import { INITIAL_RECORDER_STATE } from '../types/recorder'
import { ElectronRecorder } from '../services/electron-recorder'

/** Return type for useScreenRecorder hook */
export interface UseScreenRecorder {
  /** Current recorder state */
  state: RecorderState
  /** Convenience: is currently recording */
  isRecording: boolean
  /** Convenience: is paused */
  isPaused: boolean
  /** Convenience: is idle/ready */
  isIdle: boolean
  /** Convenience: is stopping */
  isStopping: boolean

  /** Start recording with options */
  startRecording: (options: RecordingOptions) => Promise<void>
  /** Stop recording and return blob */
  stopRecording: () => Promise<Blob | null>
  /** Pause current recording */
  pauseRecording: () => void
  /** Resume paused recording */
  resumeRecording: () => void

  /** Available capture sources */
  sources: CaptureSource[]
  /** Refresh sources list */
  refreshSources: () => Promise<void>
  /** Sources loading state */
  sourcesLoading: boolean

  /** Current error message */
  error: string | null
  /** Clear error state */
  clearError: () => void
}

/**
 * Hook for screen recording functionality
 * Provides reactive state, memoized actions, and automatic cleanup
 */
export function useScreenRecorder(): UseScreenRecorder {
  const recorderRef = useRef<IRecorder | null>(null)
  const [state, setState] = useState<RecorderState>({ ...INITIAL_RECORDER_STATE })
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize recorder and subscribe to state changes
  useEffect(() => {
    const recorder = new ElectronRecorder()
    recorderRef.current = recorder

    // Subscribe to state changes
    const unsubscribe = recorder.onStateChange((newState) => {
      setState(newState)
      if (newState.error) {
        setError(newState.error)
      }
    })

    // Load initial sources
    setSourcesLoading(true)
    recorder.getSources()
      .then(setSources)
      .catch(() => setError('Failed to load capture sources'))
      .finally(() => setSourcesLoading(false))

    // Cleanup on unmount
    return () => {
      unsubscribe()
      // Stop recording if component unmounts during recording
      const currentState = recorder.getState()
      if (currentState.status === 'recording' || currentState.status === 'paused') {
        recorder.stopRecording().catch(() => {
          // Ignore cleanup errors
        })
      }
    }
  }, [])

  const startRecording = useCallback(async (options: RecordingOptions) => {
    setError(null)
    try {
      await recorderRef.current?.startRecording(options)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording'
      setError(message)
      throw err
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    try {
      const blob = await recorderRef.current?.stopRecording()
      return blob ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording'
      setError(message)
      return null
    }
  }, [])

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pauseRecording()
  }, [])

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resumeRecording()
  }, [])

  const refreshSources = useCallback(async () => {
    setSourcesLoading(true)
    try {
      const result = await recorderRef.current?.getSources()
      if (result) setSources(result)
    } catch (err) {
      setError('Failed to refresh sources')
    } finally {
      setSourcesLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    state,
    isRecording: state.status === 'recording' || state.status === 'paused',
    isPaused: state.status === 'paused',
    isIdle: state.status === 'idle',
    isStopping: state.status === 'stopping',

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,

    // Sources
    sources,
    refreshSources,
    sourcesLoading,

    // Error handling
    error,
    clearError
  }
}
