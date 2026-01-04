# Phase 01: Project Setup Documentation

## Overview

Phase 01 establishes the foundational infrastructure for the Screen Recorder application. This phase sets up the Electron + React + TypeScript development environment and creates the build pipeline.

**Status**: COMPLETED (2026-01-04)

## Completed Setup Tasks

### 1. Electron Configuration

**File**: `electron.vite.config.ts`

The configuration file defines the build process for all three Electron processes:

```typescript
// Main Process Configuration
main: {
  build: {
    outDir: 'dist/main',
    rollupOptions: {
      external: ['electron']  // Don't bundle Electron
    }
  }
}

// Preload Script Configuration
preload: {
  build: {
    outDir: 'dist/preload',
    rollupOptions: {
      external: ['electron']  // Don't bundle Electron
    }
  }
}

// Renderer Process Configuration
renderer: {
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer'
  },
  plugins: [react()],
  base: './',  // Critical for Windows file:// protocol
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer')
    }
  }
}
```

**Key Points**:
- Separate build outputs for main, preload, and renderer
- Electron externalized to prevent bundling
- React plugin enabled for JSX support
- Path aliases configured for clean imports
- Base set to `./` for Windows file:// protocol compatibility

### 2. TypeScript Configuration

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

**Configuration Details**:

| Option | Value | Purpose |
|--------|-------|---------|
| `target` | ES2022 | Modern JavaScript feature support |
| `module` | ESNext | Allows Vite to handle module bundling |
| `strict` | true | Enables all strict type checking options |
| `jsx` | react-jsx | New JSX transform (no React import needed) |
| `baseUrl` + `paths` | Configured | Path alias support (@/*) |
| `noUnusedLocals` | true | Catches unused variables |
| `noUnusedParameters` | true | Catches unused function parameters |

### 3. Package Dependencies

**File**: `package.json`

**Core Dependencies** (in devDependencies):

| Package | Version | Purpose |
|---------|---------|---------|
| electron | ^33.0.0 | Desktop framework |
| react | ^18.3.0 | UI library |
| react-dom | ^18.3.0 | React DOM binding |
| typescript | ^5.6.0 | Type checking and transpilation |
| vite | ^5.4.0 | Build tool and dev server |
| electron-vite | ^2.3.0 | Electron-optimized build tool |
| @vitejs/plugin-react | ^4.3.0 | React support in Vite |
| electron-builder | ^25.0.0 | App packaging and installer creation |

**Build Configuration**:

```json
"build": {
  "appId": "com.screen-recorder.app",
  "productName": "Screen Recorder",
  "directories": {
    "output": "release"
  },
  "win": {
    "target": ["nsis"],
    "icon": "public/icon.png"
  },
  "files": [
    "dist/**/*",
    "!**/node_modules/**"
  ]
}
```

### 4. Main Process Implementation

**File**: `src/main/index.ts`

The main process handles:

```typescript
// Window initialization
- BrowserWindow creation with security settings
- Preload script integration
- Development vs. production rendering

// Window Configuration
- Size: 1200x800
- Minimum size: 800x600
- Context isolation: enabled
- Sandbox: enabled
- Node integration: disabled
- Preload script: ../preload/index.js

// Rendering modes
- Development: http://localhost:5173 (dev server)
- Production: Load from compiled index.html
- DevTools: Automatically opened in development

// Lifecycle Management
- Window creation on app ready
- Window restoration on activate (macOS)
- App quit on all windows closed (non-macOS)
```

### 5. Preload Script

**File**: `src/preload/index.ts`

The preload script sets up the context bridge for secure IPC:

```typescript
// Current Implementation (Phase 01)
contextBridge.exposeInMainWorld('api', {
  getVersion: (): string => '1.0.0'
})

// Type Declaration
declare global {
  interface Window {
    api: {
      getVersion: () => string
    }
  }
}
```

**Placeholder**: Recording API will be added in Phase 03

### 6. React Application Setup

**File**: `src/renderer/index.tsx`

- React 18 root mount
- StrictMode enabled for development
- App component imported

**File**: `src/renderer/App.tsx`

```typescript
// Current Implementation
- Displays application header with title
- Shows version from window.api.getVersion()
- Placeholder text for recording controls
- Class-based styling with CSS modules ready
```

**File**: `src/renderer/index.html`

- Standard HTML5 structure
- Root div for React mounting
- Script tag for renderer entry point

**File**: `src/renderer/styles.css`

- Global styles placeholder
- Ready for component-scoped styles

### 7. Directory Structure

Established folder hierarchy:

```
src/
├── main/
│   └── index.ts          # Electron main process
├── preload/
│   └── index.ts          # IPC bridge script
└── renderer/
    ├── App.tsx           # Main React component
    ├── index.tsx         # React mount point
    ├── index.html        # HTML entry
    ├── styles.css        # Global styles
    ├── components/       # React components (empty)
    ├── hooks/            # Custom hooks (empty)
    ├── workers/          # Web workers (empty)
    └── types/            # Type definitions

dist/                      # Build output (generated)
├── main/
├── preload/
└── renderer/
```

## Build Process

### Development Build

```bash
npm run dev
```

- Starts Vite dev server on port 5173
- Main and preload scripts compile and watch
- Hot reload enabled for renderer
- DevTools automatically open
- Source maps available for debugging

### Production Build

```bash
npm run build
```

- Compiles main process to dist/main
- Compiles preload script to dist/preload
- Builds renderer with Vite optimization
- Creates dist/renderer with minified assets

### Windows Distribution

```bash
npm run build:win
```

- Executes full build
- Runs electron-builder
- Generates NSIS installer
- Output: release/ directory

## Security Architecture

### Three-Process Isolation

1. **Main Process**
   - Full Electron and Node.js access
   - Handles system operations
   - Communicates via IPC

2. **Preload Script**
   - Runs in main process context
   - Uses contextBridge to expose APIs
   - Controls what renderer can access
   - Type-safe interface definition

3. **Renderer Process**
   - No direct Electron/Node.js access
   - Sandboxed execution
   - Can only use exposed APIs
   - Protected from malicious content

### Configuration Enforcements

```typescript
webPreferences: {
  preload: path.join(__dirname, '../preload/index.js'),
  nodeIntegration: false,        // Prevent Node.js in renderer
  contextIsolation: true,        // Isolate main and renderer contexts
  sandbox: true                  // Enable renderer sandboxing
}
```

## Testing the Setup

### Verify Installation

```bash
# Check Node and npm versions
node --version
npm --version

# Install dependencies
npm install

# Run type checking
npm run typecheck

# Start development mode
npm run dev
```

### Expected Behavior

1. npm install completes without errors
2. npm run dev starts electron-vite dev server
3. Application window opens with title "Screen Recorder"
4. Version displays as "1.0.0"
5. DevTools opens automatically
6. Hot reload works for renderer changes
7. Main process logging visible in DevTools console

## Configuration Files Summary

| File | Purpose | Status |
|------|---------|--------|
| package.json | Dependencies and scripts | Configured |
| tsconfig.json | TypeScript compiler options | Configured |
| electron.vite.config.ts | Build configuration | Configured |
| src/main/index.ts | App initialization | Implemented |
| src/preload/index.ts | IPC bridge | Implemented (Placeholder) |
| src/renderer/App.tsx | UI root component | Implemented |

## Next Steps (Phase 02)

- Create detailed UI layout
- Implement component structure
- Add styling and theme support
- Establish design system
- Create placeholder components for recording controls

## Notes

- All configuration uses industry best practices
- TypeScript strict mode enforced throughout
- Security-first architecture implemented
- Ready for incremental feature development
- Phase-based development structure in place

---

**Date**: 2026-01-04
**Status**: Complete
**Version**: 1.0.0
