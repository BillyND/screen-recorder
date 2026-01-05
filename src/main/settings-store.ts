/**
 * Settings store using simple JSON file storage
 * Type-safe persistent storage for app settings
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** Output format options */
export type OutputFormat = 'mp4' | 'webm' | 'mkv' | 'gif'

/** Resolution presets */
export type Resolution = '480p' | '720p' | '1080p' | 'original'

/** FPS options */
export type FPS = 15 | 24 | 30 | 60

/** Application settings schema */
export interface AppSettings {
  saveLocation: string
  resolution: Resolution
  fps: FPS
  outputFormat: OutputFormat
  includeAudio: boolean
}

/** Settings file path */
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

/** Default settings factory */
function getDefaults(): AppSettings {
  return {
    saveLocation: app.getPath('videos'),
    resolution: 'original',
    fps: 30,
    outputFormat: 'mp4',
    includeAudio: true
  }
}

/** Read settings from file */
function readSettings(): AppSettings {
  const filePath = getSettingsPath()
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      // Merge with defaults to ensure all keys exist
      return { ...getDefaults(), ...parsed }
    }
  } catch (err) {
    console.error('Failed to read settings:', err)
  }
  return getDefaults()
}

/** Write settings to file */
function writeSettings(settings: AppSettings): void {
  const filePath = getSettingsPath()
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write settings:', err)
  }
}

/** Cached settings */
let cachedSettings: AppSettings | null = null

/** Get all settings */
export function getAllSettings(): AppSettings {
  if (!cachedSettings) {
    cachedSettings = readSettings()
  }
  return { ...cachedSettings }
}

/** Set a single setting */
export function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): void {
  if (!cachedSettings) {
    cachedSettings = readSettings()
  }
  cachedSettings[key] = value
  writeSettings(cachedSettings)
}

/** Reset to defaults */
export function resetSettings(): void {
  cachedSettings = getDefaults()
  writeSettings(cachedSettings)
}
