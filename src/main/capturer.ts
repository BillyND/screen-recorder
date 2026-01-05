/**
 * Desktop Capturer wrapper for Electron
 * Provides screen/window source discovery
 */

import { desktopCapturer, screen, NativeImage } from 'electron'
import type { CaptureSource } from '../renderer/types/recorder'

/** Thumbnail size for source previews - larger for better quality */
const THUMBNAIL_SIZE = { width: 320, height: 180 }

/**
 * Convert NativeImage to data URL
 * Returns the data URL string, or undefined if thumbnail is truly empty
 */
function thumbnailToDataURL(thumbnail: NativeImage): string | undefined {
  // Only reject if the NativeImage is completely empty
  if (thumbnail.isEmpty()) {
    return undefined
  }

  const dataUrl = thumbnail.toDataURL()

  // Only reject the minimal empty placeholder that Electron sometimes returns
  if (!dataUrl || dataUrl === 'data:image/png;base64,') {
    return undefined
  }

  return dataUrl
}

/**
 * Get display bounds by display ID or fallback to primary display
 */
function getDisplayBoundsById(displayId: number): { x: number; y: number; width: number; height: number } {
  const displays = screen.getAllDisplays()
  // Try to find display by ID
  const display = displays.find(d => d.id === displayId)
  if (display) {
    return display.bounds
  }
  // Fallback to primary display
  return screen.getPrimaryDisplay().bounds
}

/**
 * Get available capture sources (screens and windows)
 * @returns Array of capture sources with thumbnails and bounds
 */
export async function getSources(): Promise<CaptureSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: THUMBNAIL_SIZE,
    fetchWindowIcons: true
  })

  const result = sources.map(source => {
    const isScreen = source.id.startsWith('screen:')
    let bounds: { x: number; y: number; width: number; height: number } | undefined

    if (isScreen) {
      // Extract display ID from source ID (format: "screen:DISPLAY_ID:0")
      const parts = source.id.split(':')
      const displayId = parseInt(parts[1], 10) || 0
      bounds = getDisplayBoundsById(displayId)
      console.log(`[Capturer] Screen "${source.name}" (${source.id}) displayId=${displayId} -> bounds:`, bounds)
    }
    // For windows, bounds will be undefined (would need native module)

    return {
      id: source.id,
      name: source.name,
      thumbnail: thumbnailToDataURL(source.thumbnail),
      type: isScreen ? 'screen' as const : 'window' as const,
      bounds
    }
  })

  // Log summary
  const screens = result.filter(s => s.type === 'screen')
  const windows = result.filter(s => s.type === 'window')
  console.log(`[Capturer] Found ${screens.length} screens, ${windows.length} windows`)

  return result
}

/**
 * Get display scale factor at given coordinates
 * Used for DPI-aware area capture
 * @param x X coordinate
 * @param y Y coordinate
 * @returns Scale factor (e.g., 1.0, 1.25, 1.5, 2.0)
 */
export function getDisplayScaleFactor(x: number, y: number): number {
  const display = screen.getDisplayNearestPoint({ x, y })
  return display.scaleFactor
}

/**
 * Get primary display bounds
 * @returns Display bounds with x, y, width, height
 */
export function getPrimaryDisplayBounds(): { x: number; y: number; width: number; height: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  return primaryDisplay.bounds
}
