import { contextBridge } from 'electron'

// Empty bridge - will be populated in Phase 03
// This file serves as a placeholder for the IPC API

// Expose empty API to renderer
contextBridge.exposeInMainWorld('api', {
  // Recording API will be added in Phase 03
  // placeholder to verify contextBridge works
  getVersion: (): string => '1.0.0'
})

// Type declarations for window.api
declare global {
  interface Window {
    api: {
      getVersion: () => string
    }
  }
}
