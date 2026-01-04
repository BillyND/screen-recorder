import { app, BrowserWindow } from 'electron'
import path from 'path'
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
let ipcHandlersRegistered = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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
})
