/**
 * Desktop Capturer wrapper for Electron
 * Provides screen/window source discovery
 */

import { desktopCapturer, screen } from 'electron'
import type { CaptureSource } from '../renderer/types/recorder'

/** Thumbnail size for source previews */
const THUMBNAIL_SIZE = { width: 150, height: 150 }

/**
 * Get available capture sources (screens and windows)
 * @returns Array of capture sources with thumbnails
 */
export async function getSources(): Promise<CaptureSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: THUMBNAIL_SIZE,
    fetchWindowIcons: true
  })

  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    type: source.id.startsWith('screen:') ? 'screen' as const : 'window' as const
  }))
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
