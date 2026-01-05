/**
 * Main screen recorder hook
 * Wraps ElectronRecorder service with React state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { RecordingOptions, RecorderState, IRecorder } from '../types/recorder'
import { INITIAL_RECORDER_STATE } from '../types/recorder'
import { ElectronRecorder } from '../services/electron-recorder'

/** Return type for useScreenRecorder hook */
export interface UseScreenRecorder {
  state: RecorderState
  isRecording: boolean
  isPaused: boolean
  isIdle: boolean
  isStopping: boolean
  startRecording: (options: RecordingOptions) => Promise<void>
  stopRecording: () => Promise<Blob | null>
  pauseRecording: () => void
  resumeRecording: () => void
  error: string | null
  clearError: () => void
}

/**
 * Hook for screen recording functionality
 */
export function useScreenRecorder(): UseScreenRecorder {
  const recorderRef = useRef<IRecorder | null>(null)
  const [state, setState] = useState<RecorderState>({ ...INITIAL_RECORDER_STATE })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const recorder = new ElectronRecorder()
    recorderRef.current = recorder

    const unsubscribe = recorder.onStateChange((newState) => {
      setState(newState)
      if (newState.error) setError(newState.error)
    })

    return () => {
      unsubscribe()
      const currentState = recorder.getState()
      if (currentState.status === 'recording' || currentState.status === 'paused') {
        recorder.stopRecording().catch(() => {})
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

  const clearError = useCallback(() => setError(null), [])

  return {
    state,
    isRecording: state.status === 'recording' || state.status === 'paused',
    isPaused: state.status === 'paused',
    isIdle: state.status === 'idle',
    isStopping: state.status === 'stopping',
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
    clearError
  }
}
