# System Architecture

## Overview

Screen Recorder follows the Electron multi-process architecture with a focus on security and maintainability. The application is divided into three distinct processes, each with specific responsibilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Operating System                          │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
    ┌──────▼────────┐                    ┌───────▼───────┐
    │  Main Process │                    │ Utility Tasks │
    │               │                    │ (Future)      │
    │ - Electron    │                    └───────────────┘
    │ - Node.js     │
    │ - IPC Hub     │
    └──────┬────────┘
           │
        IPC Bridge
           │
    ┌──────▼────────────┐
    │  Preload Script   │
    │ - Context Bridge  │
    │ - API Exposure    │
    │ - Type Safety     │
    └──────┬────────────┘
           │
    ┌──────▼──────────────┐
    │ Renderer Process    │
    │ - React UI          │
    │ - User Interaction  │
    │ - Sandboxed         │
    │                     │
    │ ┌─────────────────┐ │
    │ │ React Components│ │
    │ │ - App           │ │
    │ │ - Layout        │ │
    │ │ - Controls      │ │
    │ └─────────────────┘ │
    │                     │
    │ ┌─────────────────┐ │
    │ │ Custom Hooks    │ │
    │ │ (Future)        │ │
    │ └─────────────────┘ │
    └─────────────────────┘
```

## Process Model

### 1. Main Process

**File**: `src/main/index.ts`

**Responsibilities**:
- Manage application lifecycle
- Create and destroy BrowserWindow instances
- Handle system-level events
- Manage IPC communication
- Control menu and system integrations
- Handle file system operations
- Manage application state

**Key Features**:
```typescript
// Window Management
- createWindow(): Create main application window
- Window size: 1200x800
- Minimum size: 800x600
- Preload integration

// Lifecycle Management
- app.whenReady(): Initialize when Electron ready
- app.on('activate'): Restore window on macOS activation
- app.on('window-all-closed'): Quit app when all windows closed

// Security Configuration
- contextIsolation: true
- nodeIntegration: false
- sandbox: true
- preload: ../preload/index.js
```

**Process Privileges**:
- Full Electron API access
- Node.js filesystem and OS modules
- System-level operations
- IPC communication hub

### 2. Preload Script

**File**: `src/preload/index.ts`

**Responsibilities**:
- Bridge between main and renderer processes
- Expose safe APIs to renderer
- Validate and filter IPC calls
- Define type-safe interfaces
- Prevent malicious renderer code from accessing system resources

**Current Implementation**:
```typescript
contextBridge.exposeInMainWorld('api', {
  getVersion: (): string => '1.0.0'
})

interface Window {
  api: {
    getVersion: () => string
  }
}
```

**Security Role**:
- Acts as gatekeeper between processes
- Only exposing explicitly defined APIs
- Type checking at compile time
- Runtime validation at exposure point

**Phase 03 Additions** (Planned):
- Recording control IPC methods
- Status update callbacks
- File system access (limited)
- System capture APIs

### 3. Renderer Process

**File**: `src/renderer/`

**Responsibilities**:
- Render user interface with React
- Handle user interactions
- Display application state
- Communicate with main process through exposed APIs
- Display real-time updates from main process

**Architecture**:

```
Renderer Process (Sandbox)
│
├── React App (App.tsx)
│   ├── Context/State Management
│   ├── Component Tree
│   └── Event Handlers
│
├── Components (src/renderer/components/)
│   ├── Recording Controls
│   ├── Preview Window
│   ├── Settings Panel
│   └── Status Indicators
│
├── Custom Hooks (src/renderer/hooks/)
│   ├── useRecording (Future)
│   ├── useSettings (Future)
│   └── useNotification (Future)
│
├── Web Workers (src/renderer/workers/)
│   ├── Video Processing (Future)
│   └── Audio Processing (Future)
│
└── IPC Interface (window.api)
    ├── getVersion()
    ├── Recording Methods (Phase 03)
    └── Settings Methods (Phase 06)
```

**Security Constraints**:
- No direct Electron API access
- No Node.js module imports
- No direct file system access
- No system-level operations
- Can only use exposed APIs from preload

## IPC Communication Pattern

### Current Pattern (Phase 01)

```typescript
// Main Process exposes via preload
contextBridge.exposeInMainWorld('api', {
  getVersion: (): string => '1.0.0'
})

// Renderer Process uses exposed API
const version = window.api.getVersion()
```

### Future Pattern (Phase 03+)

**One-Way (Main to Renderer)**:
```
Main Process → IPC Event → Renderer Process
Used for: Status updates, notifications, state changes
```

**Two-Way (Main ← → Renderer)**:
```
Renderer → IPC Invoke → Main Process
Main Process executes → Returns result → Renderer
Used for: Recording control, file operations, system queries
```

## Module Structure

### Directory Organization

```
src/
├── main/
│   └── index.ts
│       ├── BrowserWindow creation
│       ├── App lifecycle
│       ├── IPC handlers (Phase 03+)
│       └── System integration
│
├── preload/
│   └── index.ts
│       ├── contextBridge setup
│       ├── API definitions
│       ├── Type declarations
│       └── IPC wrapper functions
│
└── renderer/
    ├── App.tsx
    │   ├── Main component tree
    │   ├── Layout structure
    │   └── State management root
    │
    ├── components/
    │   ├── RecordingControl/
    │   ├── PreviewWindow/
    │   ├── SettingsPanel/
    │   └── StatusBar/
    │
    ├── hooks/
    │   ├── useRecording.ts
    │   ├── useSettings.ts
    │   └── useNotification.ts
    │
    ├── workers/
    │   ├── videoProcessor.ts
    │   └── audioProcessor.ts
    │
    ├── types/
    │   ├── index.ts (Global types)
    │   ├── recording.ts (Recording types)
    │   └── settings.ts (Settings types)
    │
    └── styles/
        ├── index.css
        ├── components.css
        └── theme.css
```

## Build Pipeline

### Development Build Process

```
1. npm run dev
   │
   ├─→ electron-vite watches src/main
   │   └─→ Compiles TS → dist/main/index.js
   │
   ├─→ electron-vite watches src/preload
   │   └─→ Compiles TS → dist/preload/index.js
   │
   ├─→ Vite starts dev server on :5173
   │   ├─→ Serves src/renderer
   │   ├─→ Hot reload for .tsx, .ts, .css
   │   └─→ Source maps for debugging
   │
   └─→ Electron launches with preload
       └─→ Opens DevTools automatically
```

### Production Build Process

```
1. npm run build
   │
   ├─→ electron-vite build
   │   ├─→ Compile src/main → dist/main/index.js
   │   ├─→ Compile src/preload → dist/preload/index.js
   │   └─→ Minify and optimize
   │
   └─→ Vite build
       ├─→ Compile src/renderer → dist/renderer/
       ├─→ Minify JS, CSS
       ├─→ Optimize assets
       └─→ Generate source maps (optional)

2. npm run build:win
   │
   └─→ electron-builder
       ├─→ Package dist/ contents
       ├─→ Create NSIS installer
       └─→ Output: release/Screen Recorder Setup 1.0.0.exe
```

## Configuration Points

### electron.vite.config.ts

```typescript
// Main Process Build
{
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['electron']  // Don't bundle Electron
      }
    }
  }
}

// Renderer Build
{
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: '../../dist/renderer'
    },
    base: './',  // Windows file:// protocol
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer')
      }
    },
    plugins: [react()]  // React JSX support
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@/*": ["src/renderer/*"]
    }
  }
}
```

### package.json

```json
{
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "build:win": "electron-vite build && electron-builder --win",
    "typecheck": "tsc --noEmit"
  },
  "build": {
    "appId": "com.screen-recorder.app",
    "productName": "Screen Recorder",
    "directories": {
      "output": "release"
    }
  }
}
```

## Security Model

### Context Isolation

**Enabled**: `contextIsolation: true`

```
┌─────────────────────────────┐
│ Main Process Context        │
│ - Full Electron API         │
│ - Full Node.js API          │
│ - IPC handlers              │
└─────────────────────────────┘
         │
         │ (contextBridge)
         │
┌─────────────────────────────┐
│ Isolated World              │
│ - window.api                │
│ - Exposed methods only      │
│ - No direct access          │
└─────────────────────────────┘
         │
┌─────────────────────────────┐
│ Renderer Process Context    │
│ - DOM API                   │
│ - window.api (sandbox)      │
│ - No Node.js                │
│ - No direct Electron API    │
└─────────────────────────────┘
```

### Sandboxing

**Enabled**: `sandbox: true`

- Renderer process cannot access system resources directly
- All file system operations go through main process via IPC
- System calls must be explicitly exposed and validated

### Node Integration

**Disabled**: `nodeIntegration: false`

- Renderer cannot require() Node.js modules
- Prevents common security vulnerabilities
- Forces explicit API exposure through preload

## Data Flow

### Synchronous API Call

```
User Action
    │
    ▼
React Event Handler
    │
    ▼
window.api.getVersion()
    │
    ▼
Preload Script (contextBridge)
    │
    ▼
Main Process
    │
    ▼
Return Value
    │
    ▼
React State Update
    │
    ▼
Re-render
```

### Asynchronous IPC (Phase 03+)

```
User Action
    │
    ▼
React Event Handler
    │
    ▼
window.api.startRecording()
    │
    ▼
IPC Send → Main Process
    │
    ▼
Main Process handles recording
    │
    ▼
window.api.onRecordingStatus (callback)
    │
    ▼
Update React State
    │
    ▼
Re-render UI
```

## Performance Considerations

### Memory Management
- Preload script minimized to reduce memory overhead
- Renderer runs in separate process, isolated from main
- Web workers for heavy computations

### Code Splitting
- Components lazy-loaded (Phase 02+)
- Styles split by feature
- Separate bundles for main/preload/renderer

### Hot Reload
- Development: Hot module replacement for renderer
- CSS hot reload for instant feedback
- Source maps for debugging

## Future Architecture Enhancements

### Phase 03+: Recording Architecture
- Add utility processes for video encoding
- Implement streaming from screencapture APIs
- Add event-driven recording state machine

### Phase 04+: Storage Architecture
- File system abstraction layer
- Database for recording metadata
- Cache management for temporary files

### Phase 06+: Settings Architecture
- Configuration file (JSON/TOML)
- Settings persistence in main process
- Renderer state sync with file system

## Technology Selection Rationale

| Technology | Reason |
|------------|--------|
| Electron | Cross-platform desktop development |
| React | Component-based UI architecture |
| TypeScript | Type safety and developer experience |
| Vite | Fast dev server and optimized builds |
| electron-vite | Optimized Electron + Vite integration |

---

**Date**: 2026-01-04
**Version**: 1.0.0
**Phase**: 01 - Project Setup
