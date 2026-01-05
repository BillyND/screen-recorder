/**
 * FFmpeg service for video conversion
 * Handles WebM to MP4/MKV/GIF conversion with progress reporting
 */

import ffmpeg from 'fluent-ffmpeg'
import * as path from 'path'
import * as fs from 'fs'
import type { Resolution, FPS, OutputFormat } from './settings-store'

// Get FFmpeg path from ffmpeg-static-electron
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static-electron').path

// Configure fluent-ffmpeg to use bundled binary
ffmpeg.setFfmpegPath(ffmpegPath)

/** Conversion options */
export interface ConversionOptions {
  resolution: Resolution
  fps: FPS
}

/** Resolution dimensions */
const RESOLUTION_MAP: Record<Resolution, { width: number; height: number } | null> = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  'original': null
}

/** Progress callback type */
export type ProgressCallback = (percent: number) => void

/** Active conversion reference */
let activeCommand: ReturnType<typeof ffmpeg> | null = null

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }
      resolve(metadata.format.duration || 0)
    })
  })
}

/**
 * Build video filter string
 */
function buildVideoFilter(options: ConversionOptions): string {
  const filters: string[] = []

  // FPS filter
  filters.push(`fps=${options.fps}`)

  // Scale filter (if not original)
  const dims = RESOLUTION_MAP[options.resolution]
  if (dims) {
    filters.push(`scale=${dims.width}:${dims.height}:flags=lanczos`)
  }

  return filters.join(',')
}

/**
 * Convert WebM to MP4
 */
export async function convertToMP4(
  inputPath: string,
  outputPath: string,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<void> {
  const duration = await getVideoDuration(inputPath)
  const videoFilter = buildVideoFilter(options)

  return new Promise((resolve, reject) => {
    activeCommand = ffmpeg(inputPath)
      .videoFilters(videoFilter)
      .videoCodec('libx264')
      .addOutputOption('-preset', 'medium')
      .addOutputOption('-crf', '22')
      .audioCodec('aac')
      .audioBitrate('128k')
      .addOutputOption('-movflags', 'faststart')
      .on('progress', (progress) => {
        if (onProgress && progress.timemark) {
          const currentSeconds = parseTimemark(progress.timemark)
          const percent = Math.min(100, (currentSeconds / duration) * 100)
          onProgress(Math.round(percent))
        }
      })
      .on('end', () => {
        activeCommand = null
        resolve()
      })
      .on('error', (err) => {
        activeCommand = null
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * Convert WebM to MKV
 */
export async function convertToMKV(
  inputPath: string,
  outputPath: string,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<void> {
  const duration = await getVideoDuration(inputPath)
  const videoFilter = buildVideoFilter(options)

  return new Promise((resolve, reject) => {
    activeCommand = ffmpeg(inputPath)
      .videoFilters(videoFilter)
      .videoCodec('libx264')
      .addOutputOption('-preset', 'medium')
      .addOutputOption('-crf', '22')
      .audioCodec('aac')
      .audioBitrate('128k')
      .on('progress', (progress) => {
        if (onProgress && progress.timemark) {
          const currentSeconds = parseTimemark(progress.timemark)
          const percent = Math.min(100, (currentSeconds / duration) * 100)
          onProgress(Math.round(percent))
        }
      })
      .on('end', () => {
        activeCommand = null
        resolve()
      })
      .on('error', (err) => {
        activeCommand = null
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * Convert WebM to GIF using two-pass palette generation
 */
export async function convertToGIF(
  inputPath: string,
  outputPath: string,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<void> {
  const duration = await getVideoDuration(inputPath)
  const dims = RESOLUTION_MAP[options.resolution] || { width: 480, height: -1 }
  const palettePath = path.join(path.dirname(outputPath), 'palette_temp.png')

  // GIF-specific FPS (cap at 15 for file size)
  const gifFps = Math.min(options.fps, 15)
  const scaleFilter = `fps=${gifFps},scale=${dims.width}:-1:flags=lanczos`

  try {
    // Pass 1: Generate palette
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(`${scaleFilter},palettegen=stats_mode=diff`)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(palettePath)
    })

    // Report 50% after palette generation
    onProgress?.(50)

    // Pass 2: Apply palette
    await new Promise<void>((resolve, reject) => {
      activeCommand = ffmpeg(inputPath)
        .input(palettePath)
        .complexFilter([
          `[0:v]${scaleFilter}[x]`,
          '[x][1:v]paletteuse=dither=sierra2_4a'
        ])
        .on('progress', (progress) => {
          if (onProgress && progress.timemark) {
            const currentSeconds = parseTimemark(progress.timemark)
            const percent = 50 + Math.min(50, (currentSeconds / duration) * 50)
            onProgress(Math.round(percent))
          }
        })
        .on('end', () => {
          activeCommand = null
          resolve()
        })
        .on('error', (err) => {
          activeCommand = null
          reject(err)
        })
        .save(outputPath)
    })
  } finally {
    // Clean up palette file
    if (fs.existsSync(palettePath)) {
      fs.unlinkSync(palettePath)
    }
  }
}

/**
 * Convert to specified format
 */
export async function convert(
  inputPath: string,
  outputPath: string,
  format: OutputFormat,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<void> {
  switch (format) {
    case 'mp4':
      return convertToMP4(inputPath, outputPath, options, onProgress)
    case 'mkv':
      return convertToMKV(inputPath, outputPath, options, onProgress)
    case 'gif':
      return convertToGIF(inputPath, outputPath, options, onProgress)
    case 'webm':
      // No conversion needed, just copy
      fs.copyFileSync(inputPath, outputPath)
      onProgress?.(100)
      return
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

/**
 * Cancel active conversion
 */
export function cancelConversion(): void {
  if (activeCommand) {
    activeCommand.kill('SIGKILL')
    activeCommand = null
  }
}

/**
 * Parse FFmpeg timemark (HH:MM:SS.ms) to seconds
 */
function parseTimemark(timemark: string): number {
  const parts = timemark.split(':')
  if (parts.length !== 3) return 0

  const hours = parseFloat(parts[0])
  const minutes = parseFloat(parts[1])
  const seconds = parseFloat(parts[2])

  return hours * 3600 + minutes * 60 + seconds
}
