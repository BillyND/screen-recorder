/**
 * IPC Handlers for main process
 * Handles communication between renderer and main
 */

import { ipcMain, BrowserWindow } from 'electron'
import { getSources, getDisplayScaleFactor, getPrimaryDisplayBounds } from './capturer'
import type { RecordingOptions } from '../renderer/types/recorder'

/** IPC channel names - must match preload */
export const IPC_CHANNELS = {
  SOURCES_LIST: 'sources:list',
  DISPLAY_SCALE_FACTOR: 'display:scale-factor',
  DISPLAY_BOUNDS: 'display:bounds',
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop'
} as const

/**
 * Register all IPC handlers
 * @param mainWindow Main browser window (for future use)
 */
export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  // Source listing
  ipcMain.handle(IPC_CHANNELS.SOURCES_LIST, async () => {
    return getSources()
  })

  // DPI scaling for area capture
  ipcMain.handle(
    IPC_CHANNELS.DISPLAY_SCALE_FACTOR,
    async (_event, x: number, y: number) => {
      // Runtime validation for numeric inputs
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error('x and y must be finite numbers')
      }
      return getDisplayScaleFactor(x, y)
    }
  )

  // Primary display bounds
  ipcMain.handle(IPC_CHANNELS.DISPLAY_BOUNDS, async () => {
    return getPrimaryDisplayBounds()
  })

  // Recording start validation
  ipcMain.handle(
    IPC_CHANNELS.RECORDING_START,
    async (_event, options: RecordingOptions) => {
      // Validate required fields
      if (!options.captureMode) {
        throw new Error('captureMode is required')
      }

      // Validate mode-specific requirements
      if (options.captureMode === 'window' && !options.windowId) {
        throw new Error('windowId is required for window capture mode')
      }

      if (options.captureMode === 'area' && !options.area) {
        throw new Error('area is required for area capture mode')
      }

      // Validate area bounds if provided
      if (options.area) {
        const { x, y, width, height } = options.area
        // Runtime type validation
        if (!Number.isFinite(x) || !Number.isFinite(y) ||
            !Number.isFinite(width) || !Number.isFinite(height)) {
          throw new Error('area values must be finite numbers')
        }
        if (width <= 0 || height <= 0) {
          throw new Error('area width and height must be positive')
        }
        if (x < 0 || y < 0) {
          throw new Error('area x and y must be non-negative')
        }
      }

      // Signal success - actual recording happens in renderer
      return { success: true }
    }
  )

  // Recording stop
  ipcMain.handle(IPC_CHANNELS.RECORDING_STOP, async () => {
    return { success: true }
  })
}

/**
 * Unregister all IPC handlers (for cleanup)
 */
export function unregisterIpcHandlers(): void {
  Object.values(IPC_CHANNELS).forEach(channel => {
    ipcMain.removeHandler(channel)
  })
}
