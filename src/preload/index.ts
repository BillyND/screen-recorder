/**
 * Preload script - Bridge between main and renderer
 * Exposes safe IPC API via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { RecordingOptions, CaptureSource } from '../renderer/types/recorder'
import type { RecordingEvent } from '../renderer/types/events'
import type { AppSettings, OutputFormat, Resolution, FPS } from '../renderer/types/settings'

/** IPC channel names - must match main process */
const IPC_CHANNELS = {
  SOURCES_LIST: 'sources:list',
  DISPLAY_SCALE_FACTOR: 'display:scale-factor',
  DISPLAY_BOUNDS: 'display:bounds',
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_SET: 'settings:set',
  SETTINGS_PICK_LOCATION: 'settings:pick-location',
  FFMPEG_CONVERT: 'ffmpeg:convert',
  FFMPEG_CANCEL: 'ffmpeg:cancel',
  FFMPEG_PROGRESS: 'ffmpeg:progress',
  VIDEO_SAVE: 'video:save',
  HIGHLIGHT_SHOW: 'highlight:show',
  HIGHLIGHT_HIDE: 'highlight:hide'
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

  /** Window controls */
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },

  /** Area selector */
  areaSelector: {
    /** Show fullscreen area selector overlay */
    show: (): Promise<{ x: number; y: number; width: number; height: number } | null> =>
      ipcRenderer.invoke('area-selector:show'),
    /** Confirm selection (called from overlay) */
    confirm: (area: { x: number; y: number; width: number; height: number }): void =>
      ipcRenderer.send('area-selector:confirm', area),
    /** Cancel selection (called from overlay) */
    cancel: (): void =>
      ipcRenderer.send('area-selector:cancel')
  },

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
  },

  /** Settings management */
  settings: {
    /** Get all settings */
    getAll: (): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),

    /** Set a single setting */
    set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),

    /** Pick save location folder */
    pickLocation: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_PICK_LOCATION)
  },

  /** FFmpeg conversion */
  ffmpeg: {
    /** Convert video file */
    convert: (
      inputPath: string,
      outputPath: string,
      format: OutputFormat,
      options: { resolution: Resolution; fps: FPS }
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG_CONVERT, inputPath, outputPath, format, options),

    /** Cancel ongoing conversion */
    cancel: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG_CANCEL),

    /** Subscribe to conversion progress */
    onProgress: (callback: (percent: number) => void): string => {
      const listenerId = `ffmpeg_progress_${++listenerCounter}`
      const handler: IpcEventHandler = (_event, percent) => {
        callback(percent as number)
      }
      eventListeners.set(listenerId, handler)
      ipcRenderer.on(IPC_CHANNELS.FFMPEG_PROGRESS, handler)
      return listenerId
    },

    /** Unsubscribe from progress */
    removeProgressListener: (listenerId: string): void => {
      const handler = eventListeners.get(listenerId)
      if (handler) {
        ipcRenderer.removeListener(IPC_CHANNELS.FFMPEG_PROGRESS, handler)
        eventListeners.delete(listenerId)
      }
    }
  },

  /** Video file operations */
  video: {
    /** Save video blob to saveLocation */
    save: async (blob: Blob, filename: string): Promise<{ success: boolean; path?: string; error?: string }> => {
      const buffer = await blob.arrayBuffer()
      return ipcRenderer.invoke(IPC_CHANNELS.VIDEO_SAVE, buffer, filename)
    }
  },

  /** Window highlight overlay */
  highlight: {
    /** Show yellow highlight overlay around bounds */
    show: (bounds: { x: number; y: number; width: number; height: number }): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.HIGHLIGHT_SHOW, bounds),

    /** Hide highlight overlay */
    hide: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.HIGHLIGHT_HIDE)
  },

  /** Shell operations */
  shell: {
    /** Show file in folder (opens file explorer and selects the file) */
    showItemInFolder: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('shell:show-item-in-folder', filePath),

    /** Open file with default application */
    openPath: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('shell:open-path', filePath)
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
