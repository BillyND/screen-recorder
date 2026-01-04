# Development Guide

## Getting Started

### System Requirements

- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Windows**: 10 or later
- **Git**: Latest version
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 2GB for dependencies

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd screen-recorder

# 2. Install dependencies
npm install

# 3. Verify installation
npm run typecheck

# 4. Start development server
npm run dev
```

## Development Workflow

### Starting Development Server

```bash
npm run dev
```

This command:
1. Starts electron-vite dev server
2. Compiles main process and preload script
3. Launches Vite dev server on http://localhost:5173
4. Opens Electron application window
5. Automatically opens DevTools
6. Enables hot reload for renderer changes

### Making Changes

#### Renderer Changes (React/TypeScript)
- Edit files in `src/renderer/`
- Changes automatically hot-reload in application
- No need to restart app

#### Main Process Changes
- Edit files in `src/main/`
- Application automatically restarts
- Watch mode enabled

#### Preload Script Changes
- Edit files in `src/preload/`
- Application automatically restarts
- Type declarations updated

### Building for Production

```bash
# Build application
npm run build

# Build Windows installer
npm run build:win

# Preview production build
npm run preview
```

## Project Structure Deep Dive

### src/main/

**Purpose**: Electron main process code

**Key Responsibilities**:
- Window creation and lifecycle
- Menu management
- System event handling
- IPC communication hub
- File system operations

**Current Files**:
- `index.ts`: Application entry point and BrowserWindow creation

**Adding IPC Handlers** (Phase 03):
```typescript
import { ipcMain } from 'electron'

// Handle IPC from renderer
ipcMain.handle('recording:start', async (event, options) => {
  // Perform recording operations
  return { success: true, recordingId: 'abc123' }
})

// Send events to renderer
mainWindow?.webContents.send('recording:status', {
  state: 'recording',
  duration: 15000
})
```

### src/preload/

**Purpose**: Secure bridge between main and renderer

**Security Rules**:
- Keep as minimal as possible
- Only expose necessary APIs
- Validate all inputs
- Type all exposed functions
- Never expose raw IPC directly

**Current Implementation**:
```typescript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Version API (Phase 01)
  getVersion: (): string => '1.0.0',

  // Recording APIs (Phase 03)
  recording: {
    start: (options: RecordingOptions) => ipcRenderer.invoke('recording:start', options),
    stop: () => ipcRenderer.invoke('recording:stop'),
    pause: () => ipcRenderer.invoke('recording:pause'),
    resume: () => ipcRenderer.invoke('recording:resume')
  },

  // Listen to events from main
  onRecordingStatus: (callback: (status: RecordingStatus) => void) => {
    ipcRenderer.on('recording:status', (event, status) => callback(status))
  }
})
```

### src/renderer/

**Purpose**: React user interface application

**Directory Structure**:

```
src/renderer/
├── App.tsx              # Root component
├── index.tsx            # React mount point
├── index.html           # HTML template
├── styles.css           # Global styles
├── types/
│   └── index.ts         # TypeScript definitions
├── components/          # React components
├── hooks/               # Custom React hooks
└── workers/             # Web workers
```

**Component Creation Example**:

```typescript
// src/renderer/components/RecordingButton.tsx
import React from 'react'

interface RecordingButtonProps {
  isRecording: boolean
  onClick: () => void
}

export const RecordingButton: React.FC<RecordingButtonProps> = ({
  isRecording,
  onClick
}) => {
  return (
    <button
      className={`recording-button ${isRecording ? 'active' : ''}`}
      onClick={onClick}
    >
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  )
}
```

**Custom Hook Example**:

```typescript
// src/renderer/hooks/useRecording.ts
import { useState, useCallback } from 'react'

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false)

  const start = useCallback(async () => {
    try {
      await window.api.recording.start({ quality: 'high' })
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }, [])

  const stop = useCallback(async () => {
    try {
      await window.api.recording.stop()
      setIsRecording(false)
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }, [])

  return { isRecording, start, stop }
}
```

## TypeScript Best Practices

### Strict Mode

The project uses TypeScript strict mode. Benefits:
- Type safety for all variables
- Mandatory null/undefined checks
- No implicit `any` types
- Better IDE support and auto-completion

### Type Definitions

Always define types for React components:

```typescript
// Good
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  // Component code
}

// Avoid (implicit any)
const Button = ({ label, onClick }) => {
  // Component code
}
```

### IPC Type Safety

Define interfaces for IPC communication:

```typescript
// src/renderer/types/recording.ts
export interface RecordingOptions {
  quality: 'low' | 'medium' | 'high'
  audioSource: 'system' | 'microphone' | 'both'
  framerate: 30 | 60
}

export interface RecordingStatus {
  state: 'idle' | 'recording' | 'paused'
  duration: number
  fileSize: number
}

export interface RecordingFile {
  id: string
  filename: string
  path: string
  createdAt: Date
  duration: number
  fileSize: number
}
```

## Configuration Files

### electron.vite.config.ts

**When to modify**:
- Adding new path aliases
- Changing build output directories
- Adding Vite plugins
- Modifying Electron configuration

**Common Modifications**:

```typescript
// Add path alias
resolve: {
  alias: {
    '@components': path.resolve(__dirname, 'src/renderer/components'),
    '@hooks': path.resolve(__dirname, 'src/renderer/hooks'),
    '@types': path.resolve(__dirname, 'src/renderer/types')
  }
}

// Configure Vite options
renderer: {
  define: {
    __DEV__: process.env.NODE_ENV === 'development'
  }
}
```

### tsconfig.json

**When to modify**:
- Adding new lib support
- Changing compilation target
- Modifying strict mode rules
- Updating path aliases to match config file

**Do not modify**:
- `strict: true` (enforce type safety)
- `noEmit: true` (use Vite for building)

### package.json

**Scripts**:
```json
{
  "scripts": {
    "dev": "electron-vite dev",           // Development
    "build": "electron-vite build",       // Production build
    "build:win": "... && electron-builder --win",  // Windows installer
    "preview": "electron-vite preview",   // Preview production build
    "typecheck": "tsc --noEmit"           // Check types without emitting
  }
}
```

**Modifying Dependencies**:

```bash
# Add dependency
npm install <package-name>

# Add dev dependency
npm install --save-dev <package-name>

# Update package.json version
npm version patch|minor|major

# Verify types are available
npm install --save-dev @types/<package-name>
```

## Code Style and Standards

### TypeScript

- Use type annotations for all function parameters and returns
- Prefer interfaces over type aliases for object shapes
- Use const assertions for literal types
- Avoid `any` type - use generics instead

```typescript
// Good
function processData(input: string[]): number {
  return input.length
}

const colors = ['red', 'green', 'blue'] as const
type Color = typeof colors[number]

// Avoid
function processData(input: any): any {
  return input.length
}
```

### React

- Use functional components with hooks
- Memoize expensive computations
- Separate concerns into custom hooks
- Keep components focused and small

```typescript
// Good
const Counter: React.FC = () => {
  const [count, setCount] = useState(0)

  const increment = useCallback(() => {
    setCount(c => c + 1)
  }, [])

  return <button onClick={increment}>{count}</button>
}

// Avoid class components (unless necessary)
class Counter extends React.Component {
  state = { count: 0 }
  render() {
    return <button>{this.state.count}</button>
  }
}
```

### File Organization

- One component per file
- Keep components near their usage
- Group related files in directories
- Use index.ts for clean exports

```typescript
// src/renderer/components/Recording/index.ts
export { RecordingButton } from './RecordingButton'
export { RecordingStatus } from './RecordingStatus'
export type { RecordingProps } from './types'

// Usage
import { RecordingButton, RecordingStatus } from '@/components/Recording'
```

## Debugging

### DevTools

Development mode automatically opens DevTools with features:
- JavaScript debugging
- Network monitoring
- Console logging
- React DevTools (when installed)
- Source maps for TypeScript

### Console Logging

```typescript
// Development
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data)
}

// Using define in config
if (__DEV__) {
  console.log('Debug info:', data)
}
```

### Error Handling

```typescript
// In main process
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error)
  mainWindow?.webContents.send('error', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  })
}

// In renderer
window.api.onError((error) => {
  console.error('Main process error:', error)
  // Show user-friendly error
})
```

## Testing (Future Phases)

### Unit Tests
- Framework: Jest or Vitest
- Location: `src/__tests__/`
- Pattern: `*.test.ts`, `*.test.tsx`

### E2E Tests
- Framework: Electron Playwright
- Location: `e2e/`
- Test main workflow scenarios

### Running Tests
```bash
npm run test           # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const SettingsPanel = React.lazy(() =>
  import('./components/SettingsPanel')
)

export const App: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsPanel />
    </Suspense>
  )
}
```

### Memoization

```typescript
// Memoize expensive components
const ExpensiveComponent = React.memo(({ data }: Props) => {
  return <div>{data}</div>
}, (prev, next) => prev.data === next.data)

// Memoize callbacks
const handleClick = useCallback(() => {
  // Handle click
}, [dependency])
```

### Web Workers

```typescript
// src/renderer/workers/processor.ts
self.onmessage = (event: MessageEvent<InputData>) => {
  const result = processHeavy(event.data)
  self.postMessage(result)
}

// src/renderer/hooks/useWorker.ts
const useWorker = (script: string) => {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    workerRef.current = new Worker(script)
    return () => workerRef.current?.terminate()
  }, [])

  return workerRef.current
}
```

## Common Tasks

### Adding a New Feature

1. Create feature branch: `git checkout -b feature/my-feature`
2. Create component structure in `src/renderer/components/`
3. Add type definitions in `src/renderer/types/`
4. Implement React component
5. Add IPC handlers in `src/main/` if needed
6. Expose APIs in `src/preload/` if needed
7. Update tests
8. Document in `docs/`

### Adding Dependencies

```bash
# NPM package
npm install package-name

# Dev-only package
npm install --save-dev package-name

# Update lock file
npm install

# Update tsconfig.json if types needed
npm install --save-dev @types/package-name
```

### Building Installers

```bash
# Clean build
npm run build

# Build Windows installer
npm run build:win

# Output in release/ directory
```

## Troubleshooting

### Hot Reload Not Working
1. Check if main process has errors
2. Verify tsconfig.json is not excluding files
3. Restart dev server: `npm run dev`

### Type Errors
1. Run `npm run typecheck` to see all errors
2. Check tsconfig.json strict settings
3. Ensure all imports have correct paths

### Module Not Found
1. Check path alias in electron.vite.config.ts
2. Verify file exists at specified path
3. Check tsconfig.json paths match

### Electron Not Starting
1. Check console for error messages
2. Verify preload script compiles
3. Check BrowserWindow configuration
4. Ensure dist/ directory exists

---

**Date**: 2026-01-04
**Version**: 1.0.0
**Phase**: 01 - Project Setup
