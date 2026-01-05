/**
 * Window Highlight Service
 * Creates a transparent overlay to highlight selected windows
 */

import { BrowserWindow, screen } from 'electron'

/** Highlight overlay window */
let highlightWindow: BrowserWindow | null = null

/** Border thickness in pixels */
const BORDER_WIDTH = 3

/**
 * Show highlight around a window by its source ID
 * @param sourceId - The source ID from desktopCapturer (e.g., "window:12345")
 */
export async function showHighlight(sourceId: string): Promise<void> {
  // Hide existing highlight first
  hideHighlight()

  // Extract window handle from source ID
  // Format: "window:12345" or "screen:0:0"
  if (!sourceId.startsWith('window:')) {
    // For screens, highlight the entire display
    const screenId = sourceId.replace('screen:', '')
    const displays = screen.getAllDisplays()
    const displayIndex = parseInt(screenId.split(':')[0], 10) || 0
    const display = displays[displayIndex] || screen.getPrimaryDisplay()

    createHighlightWindow(display.bounds)
    return
  }

  // For windows, we need to get the window bounds
  // Use Electron's desktopCapturer to get window info
  const { desktopCapturer } = require('electron')

  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      fetchWindowIcons: false,
      thumbnailSize: { width: 1, height: 1 }
    })

    const source = sources.find((s: { id: string }) => s.id === sourceId)
    if (!source) {
      console.warn('[WindowHighlight] Source not found:', sourceId)
      return
    }

    // Get window bounds using native module or workaround
    // Since Electron doesn't expose window bounds directly,
    // we'll use a screen-based approach for now
    const primaryDisplay = screen.getPrimaryDisplay()

    // Create a highlight that covers a reasonable area
    // This is a simplified approach - for precise bounds we'd need native modules
    createHighlightWindow({
      x: primaryDisplay.bounds.x + 100,
      y: primaryDisplay.bounds.y + 100,
      width: 800,
      height: 600
    })
  } catch (err) {
    console.error('[WindowHighlight] Error getting window bounds:', err)
  }
}

/**
 * Show highlight for specific bounds
 */
export function showHighlightForBounds(bounds: { x: number; y: number; width: number; height: number }): void {
  console.log('[WindowHighlight] showHighlightForBounds called with:', bounds)
  hideHighlight()
  createHighlightWindow(bounds)
}

/**
 * Hide the highlight overlay
 */
export function hideHighlight(): void {
  if (highlightWindow && !highlightWindow.isDestroyed()) {
    highlightWindow.close()
  }
  highlightWindow = null
}

/**
 * Create the highlight overlay window
 */
function createHighlightWindow(bounds: { x: number; y: number; width: number; height: number }): void {
  console.log('[WindowHighlight] Creating highlight window at:', {
    x: bounds.x - BORDER_WIDTH,
    y: bounds.y - BORDER_WIDTH,
    width: bounds.width + BORDER_WIDTH * 2,
    height: bounds.height + BORDER_WIDTH * 2
  })

  highlightWindow = new BrowserWindow({
    x: bounds.x - BORDER_WIDTH,
    y: bounds.y - BORDER_WIDTH,
    width: bounds.width + BORDER_WIDTH * 2,
    height: bounds.height + BORDER_WIDTH * 2,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Ignore mouse events so user can still interact with underlying windows
  highlightWindow.setIgnoreMouseEvents(true)

  // Load HTML content with yellow border
  const borderColor = '#FACC15' // yellow-400
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            background: transparent;
            overflow: hidden;
          }
          .highlight {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: ${BORDER_WIDTH}px solid ${borderColor};
            border-radius: 4px;
            box-shadow: 0 0 10px ${borderColor}80, inset 0 0 10px ${borderColor}40;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 10px ${borderColor}80, inset 0 0 10px ${borderColor}40; }
            50% { opacity: 0.8; box-shadow: 0 0 20px ${borderColor}, inset 0 0 15px ${borderColor}60; }
          }
        </style>
      </head>
      <body>
        <div class="highlight"></div>
      </body>
    </html>
  `

  highlightWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

/**
 * Check if highlight is currently visible
 */
export function isHighlightVisible(): boolean {
  return highlightWindow !== null && !highlightWindow.isDestroyed()
}
