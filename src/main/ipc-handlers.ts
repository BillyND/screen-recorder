/**
 * IPC Handlers for main process
 * Handles communication between renderer and main
 */

import { ipcMain, BrowserWindow, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { getSources, getDisplayScaleFactor, getPrimaryDisplayBounds } from './capturer'
import { getAllSettings, setSetting, type AppSettings, type OutputFormat, type Resolution, type FPS } from './settings-store'
import { convert, cancelConversion } from './ffmpeg-service'
import type { RecordingOptions } from '../renderer/types/recorder'

/** IPC channel names - must match preload */
export const IPC_CHANNELS = {
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
  VIDEO_SAVE: 'video:save'
} as const

/**
 * Register all IPC handlers
 * @param mainWindow Main browser window
 */
export function registerIpcHandlers(mainWindow: BrowserWindow): void {
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

  // Settings: get all
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    return getAllSettings()
  })

  // Settings: set single value
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    async (_event, key: keyof AppSettings, value: unknown) => {
      setSetting(key, value as AppSettings[typeof key])
    }
  )

  // Settings: pick save location
  ipcMain.handle(IPC_CHANNELS.SETTINGS_PICK_LOCATION, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Save Location'
    })

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    const location = result.filePaths[0]
    setSetting('saveLocation', location)
    return location
  })

  // FFmpeg: convert video
  ipcMain.handle(
    IPC_CHANNELS.FFMPEG_CONVERT,
    async (
      _event,
      inputPath: string,
      outputPath: string,
      format: OutputFormat,
      options: { resolution: Resolution; fps: FPS }
    ) => {
      try {
        await convert(inputPath, outputPath, format, options, (percent) => {
          mainWindow.webContents.send(IPC_CHANNELS.FFMPEG_PROGRESS, percent)
        })
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Conversion failed'
        return { success: false, error: message }
      }
    }
  )

  // FFmpeg: cancel conversion
  ipcMain.handle(IPC_CHANNELS.FFMPEG_CANCEL, async () => {
    cancelConversion()
    return { success: true }
  })

  // Video: save to saveLocation
  ipcMain.handle(
    IPC_CHANNELS.VIDEO_SAVE,
    async (_event, buffer: ArrayBuffer, filename: string) => {
      try {
        const settings = getAllSettings()
        const saveDir = settings.saveLocation

        // Ensure directory exists
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true })
        }

        const filePath = path.join(saveDir, filename)
        fs.writeFileSync(filePath, Buffer.from(buffer))

        return { success: true, path: filePath }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save video'
        return { success: false, error: message }
      }
    }
  )
}

/**
 * Unregister all IPC handlers (for cleanup)
 */
export function unregisterIpcHandlers(): void {
  Object.values(IPC_CHANNELS).forEach(channel => {
    ipcMain.removeHandler(channel)
  })
}
