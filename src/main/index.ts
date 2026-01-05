import { app, BrowserWindow } from 'electron'
import path from 'path'
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc-handlers'
import { registerWindowControls } from './window-controls'
import { registerAreaSelectorHandlers, unregisterAreaSelectorHandlers } from './area-selector-window'

let mainWindow: BrowserWindow | null = null
let ipcHandlersRegistered = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    frame: false,
    titleBarStyle: 'hidden',
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  // Register IPC handlers once after first window
  if (mainWindow && !ipcHandlersRegistered) {
    registerIpcHandlers(mainWindow)
    registerWindowControls(mainWindow)
    registerAreaSelectorHandlers()
    ipcHandlersRegistered = true
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      // Handlers already registered, no need to re-register
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  unregisterIpcHandlers()
  unregisterAreaSelectorHandlers()
})
