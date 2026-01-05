/**
 * Area selector overlay window
 * Creates a fullscreen transparent window for area selection
 */

import { BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'

let overlayWindow: BrowserWindow | null = null
let resolveSelection: ((area: { x: number; y: number; width: number; height: number } | null) => void) | null = null

/**
 * Create and show the area selection overlay
 * Returns the selected area or null if cancelled
 */
export function showAreaSelector(): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    resolveSelection = resolve

    // Get primary display bounds
    const primaryDisplay = screen.getPrimaryDisplay()
    const { x, y, width, height } = primaryDisplay.bounds

    // Create fullscreen transparent window
    overlayWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // Load overlay HTML
    const overlayHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 100vw;
            height: 100vh;
            background: transparent;
            cursor: crosshair;
            overflow: hidden;
            user-select: none;
          }
          canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          .instructions {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <canvas id="canvas"></canvas>
        <div class="instructions">Drag to select area. Press Enter to confirm, Escape to cancel.</div>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          let isDrawing = false;
          let startX = 0, startY = 0;
          let currentArea = null;

          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;

          canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            startX = e.clientX;
            startY = e.clientY;
          });

          canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;

            const width = e.clientX - startX;
            const height = e.clientY - startY;

            currentArea = {
              x: width < 0 ? e.clientX : startX,
              y: height < 0 ? e.clientY : startY,
              width: Math.abs(width),
              height: Math.abs(height)
            };

            // Clear and draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Clear selection area
            ctx.clearRect(currentArea.x, currentArea.y, currentArea.width, currentArea.height);

            // Draw border
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(currentArea.x, currentArea.y, currentArea.width, currentArea.height);

            // Draw dimensions
            if (currentArea.width > 50 && currentArea.height > 30) {
              ctx.fillStyle = '#3b82f6';
              ctx.font = 'bold 14px system-ui';
              ctx.fillText(
                currentArea.width + ' x ' + currentArea.height,
                currentArea.x + 5,
                currentArea.y > 25 ? currentArea.y - 8 : currentArea.y + currentArea.height + 20
              );
            }
          });

          canvas.addEventListener('mouseup', () => {
            isDrawing = false;
            // Auto-confirm if valid selection
            if (currentArea && currentArea.width > 10 && currentArea.height > 10) {
              window.api?.areaSelector?.confirm?.(currentArea);
            }
          });

          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              window.api?.areaSelector?.cancel?.();
            } else if (e.key === 'Enter' && currentArea && currentArea.width > 10 && currentArea.height > 10) {
              window.api?.areaSelector?.confirm?.(currentArea);
            }
          });
        </script>
      </body>
      </html>
    `

    overlayWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(overlayHtml))

    overlayWindow.on('closed', () => {
      overlayWindow = null
      if (resolveSelection) {
        resolveSelection(null)
        resolveSelection = null
      }
    })
  })
}

/**
 * Close the overlay and resolve with selected area
 */
export function confirmAreaSelection(area: { x: number; y: number; width: number; height: number }): void {
  if (resolveSelection) {
    resolveSelection(area)
    resolveSelection = null
  }
  if (overlayWindow) {
    overlayWindow.close()
    overlayWindow = null
  }
}

/**
 * Close the overlay and resolve with null
 */
export function cancelAreaSelection(): void {
  if (resolveSelection) {
    resolveSelection(null)
    resolveSelection = null
  }
  if (overlayWindow) {
    overlayWindow.close()
    overlayWindow = null
  }
}

/**
 * Register area selector IPC handlers
 */
export function registerAreaSelectorHandlers(): void {
  ipcMain.handle('area-selector:show', async () => {
    return await showAreaSelector()
  })

  ipcMain.on('area-selector:confirm', (_event, area) => {
    confirmAreaSelection(area)
  })

  ipcMain.on('area-selector:cancel', () => {
    cancelAreaSelection()
  })
}

/**
 * Unregister area selector IPC handlers
 */
export function unregisterAreaSelectorHandlers(): void {
  ipcMain.removeHandler('area-selector:show')
  ipcMain.removeAllListeners('area-selector:confirm')
  ipcMain.removeAllListeners('area-selector:cancel')
}
