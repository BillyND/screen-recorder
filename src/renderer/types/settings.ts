/**
 * Settings types for screen recorder configuration
 */

/** Supported output formats */
export type OutputFormat = 'mp4' | 'webm' | 'mkv' | 'gif'

/** Resolution presets */
export type Resolution = '480p' | '720p' | '1080p' | 'original'

/** FPS options */
export type FPS = 15 | 24 | 30 | 60

/** Application settings */
export interface AppSettings {
  /** Default save location for recordings */
  saveLocation: string
  /** Output resolution */
  resolution: Resolution
  /** Frames per second */
  fps: FPS
  /** Output file format */
  outputFormat: OutputFormat
  /** Include system audio */
  includeAudio: boolean
}

/** Settings API exposed to renderer */
export interface SettingsAPI {
  getAll: () => Promise<AppSettings>
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  pickLocation: () => Promise<string | null>
}

/** Resolution dimensions mapping */
export const RESOLUTION_MAP: Record<Resolution, { width: number; height: number } | null> = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  'original': null // Keep original resolution
}

/** Resolution labels */
export const RESOLUTION_LABELS: Record<Resolution, string> = {
  '480p': '480p (SD)',
  '720p': '720p (HD)',
  '1080p': '1080p (Full HD)',
  'original': 'Original'
}

/** FPS labels */
export const FPS_OPTIONS: FPS[] = [15, 24, 30, 60]

/** Format labels */
export const FORMAT_LABELS: Record<OutputFormat, string> = {
  'mp4': 'MP4 (H.264)',
  'webm': 'WebM (VP9)',
  'mkv': 'MKV (H.264)',
  'gif': 'GIF (Animated)'
}
