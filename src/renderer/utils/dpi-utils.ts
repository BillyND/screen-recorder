/**
 * DPI scaling utilities for Windows high-DPI displays
 * Converts logical (CSS) pixels to physical (native) pixels
 */

import type { CropArea } from '../types/recorder'

/**
 * Scale a logical area to physical pixels based on display DPI
 * @param logicalArea Area in logical (CSS) pixels
 * @returns Area in physical (native) pixels
 */
export async function scaleAreaForDPI(
  logicalArea: CropArea
): Promise<CropArea> {
  const scaleFactor = await window.api.display.getScaleFactor(
    logicalArea.x,
    logicalArea.y
  )

  return {
    x: Math.round(logicalArea.x * scaleFactor),
    y: Math.round(logicalArea.y * scaleFactor),
    width: Math.round(logicalArea.width * scaleFactor),
    height: Math.round(logicalArea.height * scaleFactor)
  }
}

/**
 * Scale physical pixels back to logical pixels
 * @param physicalArea Area in physical pixels
 * @returns Area in logical (CSS) pixels
 */
export async function scaleAreaFromDPI(
  physicalArea: CropArea
): Promise<CropArea> {
  const scaleFactor = await window.api.display.getScaleFactor(
    physicalArea.x,
    physicalArea.y
  )

  return {
    x: Math.round(physicalArea.x / scaleFactor),
    y: Math.round(physicalArea.y / scaleFactor),
    width: Math.round(physicalArea.width / scaleFactor),
    height: Math.round(physicalArea.height / scaleFactor)
  }
}

/**
 * Get the current display scale factor
 * Common values: 1.0 (100%), 1.25 (125%), 1.5 (150%), 2.0 (200%)
 */
export async function getDisplayScaleFactor(x = 0, y = 0): Promise<number> {
  return window.api.display.getScaleFactor(x, y)
}

/**
 * Check if display is using high DPI (>100%)
 */
export async function isHighDPI(x = 0, y = 0): Promise<boolean> {
  const scale = await getDisplayScaleFactor(x, y)
  return scale > 1
}
