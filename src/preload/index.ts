/**
 * Preload script - Bridge between main and renderer
 * Exposes safe IPC API via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { RecordingOptions, CaptureSource } from '../renderer/types/recorder'
import type { RecordingEvent } from '../renderer/types/events'

/** IPC channel names - must match main process */
const IPC_CHANNELS = {
  SOURCES_LIST: 'sources:list',
  DISPLAY_SCALE_FACTOR: 'display:scale-factor',
  DISPLAY_BOUNDS: 'display:bounds',
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop'
} as const

/** Event listeners for cleanup */
type IpcEventHandler = (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
const eventListeners = new Map<string, IpcEventHandler>()
let listenerCounter = 0

/**
 * API exposed to renderer via window.api
 */
const api = {
  /** App version */
  getVersion: (): string => '1.0.0',

  /** Source discovery */
  sources: {
    /** List available screens and windows */
    list: (): Promise<CaptureSource[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SOURCES_LIST)
  },

  /** Display information */
  display: {
    /** Get DPI scale factor at coordinates */
    getScaleFactor: (x: number, y: number): Promise<number> =>
      ipcRenderer.invoke(IPC_CHANNELS.DISPLAY_SCALE_FACTOR, x, y),

    /** Get primary display bounds */
    getBounds: (): Promise<{ x: number; y: number; width: number; height: number }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DISPLAY_BOUNDS)
  },

  /** Recording control */
  recording: {
    /** Start recording with validation */
    start: async (options: RecordingOptions): Promise<{ success: boolean }> => {
      // Client-side validation
      if (!options.captureMode) {
        throw new Error('captureMode is required')
      }
      if (options.captureMode === 'window' && !options.windowId) {
        throw new Error('windowId is required for window capture mode')
      }
      if (options.captureMode === 'area' && !options.area) {
        throw new Error('area is required for area capture mode')
      }
      return ipcRenderer.invoke(IPC_CHANNELS.RECORDING_START, options)
    },

    /** Stop recording */
    stop: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDING_STOP)
  },

  /** Event subscription */
  events: {
    /**
     * Subscribe to recording events
     * @returns Cleanup function ID
     */
    onRecordingEvent: (callback: (event: RecordingEvent) => void): string => {
      const listenerId = `listener_${++listenerCounter}`
      const handler: IpcEventHandler = (_event, recordingEvent) => {
        callback(recordingEvent as RecordingEvent)
      }
      eventListeners.set(listenerId, handler)
      ipcRenderer.on('recording:event', handler)
      return listenerId
    },

    /**
     * Unsubscribe from recording events
     * @param listenerId ID returned from onRecordingEvent
     */
    removeListener: (listenerId: string): void => {
      const handler = eventListeners.get(listenerId)
      if (handler) {
        ipcRenderer.removeListener('recording:event', handler)
        eventListeners.delete(listenerId)
      }
    },

    /** Remove all event listeners */
    removeAllListeners: (): void => {
      eventListeners.forEach((handler) => {
        ipcRenderer.removeListener('recording:event', handler)
      })
      eventListeners.clear()
    }
  }
}

// Expose API to renderer
contextBridge.exposeInMainWorld('api', api)

// Type declaration for window.api
export type ElectronAPI = typeof api

declare global {
  interface Window {
    api: ElectronAPI
  }
}
