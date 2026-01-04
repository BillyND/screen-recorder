# Phase 02: Recorder Interface & Type System

**Status**: COMPLETED (2026-01-04)

**Phase Duration**: Implementation phase for recording system foundations

## Overview

Phase 02 establishes the complete type system and API contract for the recording functionality. This foundation supports all future recording implementation phases (03-08) and enables platform-agnostic design for potential Tauri migration.

## Architecture Overview

### Three-Layer Type System

```
┌─────────────────────────────────┐
│   Renderer Process (React)      │
│   - Uses RecorderAPI            │
│   - Emits/receives events       │
└──────────┬──────────────────────┘
           │
     IPC Bridge (Preload)
           │
┌──────────▼──────────────────────┐
│   Main Process (Node/Electron)  │
│   - Implements IRecorder        │
│   - Manages recording state     │
└─────────────────────────────────┘
```

## Type Definitions

### 1. Core Recorder Types (`src/renderer/types/recorder.ts`)

#### CaptureMode
Determines what content to record:
```typescript
type CaptureMode = 'fullscreen' | 'window' | 'area'
```

**Values**:
- `'fullscreen'` - Capture entire screen
- `'window'` - Capture specific window by ID
- `'area'` - Capture user-selected rectangular area

#### CropArea
Defines rectangular region for area capture:
```typescript
interface CropArea {
  x: number       // Left edge in pixels
  y: number       // Top edge in pixels
  width: number   // Width in pixels
  height: number  // Height in pixels
}
```

**Usage**: Only used when `captureMode === 'area'`

#### RecordingOptions
Configuration passed to `startRecording()`:
```typescript
interface RecordingOptions {
  captureMode: CaptureMode
  windowId?: string             // Required for 'window' mode
  area?: CropArea               // Required for 'area' mode
  includeSystemAudio?: boolean  // Default: false
  includeMicrophone?: boolean   // Default: false
  videoBitsPerSecond?: number   // Default: 2500000 (2.5 Mbps)
  frameRate?: number            // Default: 30
}
```

**Defaults**:
```typescript
const DEFAULT_RECORDING_OPTIONS: Partial<RecordingOptions> = {
  includeSystemAudio: false,
  includeMicrophone: false,
  videoBitsPerSecond: 2500000,  // 2.5 Mbps
  frameRate: 30
}
```

**Validation Rules**:
- `captureMode` is required
- If `captureMode === 'window'`, `windowId` must be provided
- If `captureMode === 'area'`, `area` must be provided with valid coordinates
- `videoBitsPerSecond` should be between 500000 (0.5 Mbps) and 10000000 (10 Mbps)
- `frameRate` should be 30 or 60

#### RecorderStatus
Current state of the recording system:
```typescript
type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopping'
```

**State Transitions**:
```
idle → recording → {paused ↔ recording} → stopping → idle
                  └────────────────────┘
```

#### RecorderState
Complete state snapshot exposed to UI:
```typescript
interface RecorderState {
  status: RecorderStatus  // Current status
  duration: number        // Elapsed seconds
  fileSize: number        // Accumulated bytes
  error?: string          // Error message if failed
}
```

**Update Frequency**: Emitted on every state change

**Initial State**:
```typescript
const INITIAL_RECORDER_STATE: RecorderState = {
  status: 'idle',
  duration: 0,
  fileSize: 0
}
```

#### CaptureSource
Information about available capture targets:
```typescript
interface CaptureSource {
  id: string
  name: string
  thumbnail?: string  // Base64 data URL
  type: 'screen' | 'window'
}
```

**Example**:
```typescript
{
  id: 'screen-0',
  name: 'Primary Display (1920x1080)',
  type: 'screen',
  thumbnail: 'data:image/png;base64,...'
}
```

#### IRecorder
Platform-agnostic recorder interface:
```typescript
interface IRecorder {
  // Core recording operations
  startRecording(options: RecordingOptions): Promise<void>
  stopRecording(): Promise<Blob>
  pauseRecording(): void
  resumeRecording(): void

  // State management
  getState(): RecorderState

  // Source discovery
  getSources(): Promise<CaptureSource[]>

  // Event subscription (returns unsubscribe function)
  onStateChange(callback: (state: RecorderState) => void): () => void

  // Optional: chunked recording for memory management
  onChunk?(callback: (chunk: Blob) => void): () => void
}
```

### 2. Recording Events (`src/renderer/types/events.ts`)

Events emitted during recording lifecycle:

#### RecordingStartedEvent
```typescript
interface RecordingStartedEvent {
  type: 'recording:started'
  timestamp: number  // Unix timestamp in milliseconds
}
```

#### RecordingStoppedEvent
```typescript
interface RecordingStoppedEvent {
  type: 'recording:stopped'
  blob: Blob          // Complete video data
  duration: number    // Total duration in seconds
}
```

#### RecordingPausedEvent
```typescript
interface RecordingPausedEvent {
  type: 'recording:paused'
  timestamp: number
}
```

#### RecordingResumedEvent
```typescript
interface RecordingResumedEvent {
  type: 'recording:resumed'
  timestamp: number
}
```

#### RecordingErrorEvent
```typescript
interface RecordingErrorEvent {
  type: 'recording:error'
  error: string      // Human-readable error message
  code?: string      // Machine-readable error code
}
```

**Common Error Codes**:
- `ERR_RECORDER_INIT` - Failed to initialize recorder
- `ERR_SOURCE_NOT_FOUND` - Specified capture source not found
- `ERR_AUDIO_UNAVAILABLE` - Requested audio source unavailable
- `ERR_PERMISSION_DENIED` - User denied permission to capture
- `ERR_RECORDING_FAILED` - Recording process failed

#### RecordingChunkEvent
For chunked/streaming recording:
```typescript
interface RecordingChunkEvent {
  type: 'recording:chunk'
  chunk: Blob         // Data chunk
  totalSize: number   // Cumulative bytes
  chunkIndex: number  // Sequential chunk number
}
```

#### RecordingStateChangeEvent
```typescript
interface RecordingStateChangeEvent {
  type: 'recording:stateChange'
  status: 'idle' | 'recording' | 'paused' | 'stopping'
  duration: number    // Elapsed seconds
  fileSize: number    // Accumulated bytes
}
```

#### RecordingEvent Union
```typescript
type RecordingEvent =
  | RecordingStartedEvent
  | RecordingStoppedEvent
  | RecordingPausedEvent
  | RecordingResumedEvent
  | RecordingErrorEvent
  | RecordingChunkEvent
  | RecordingStateChangeEvent

type RecordingEventType = RecordingEvent['type']
```

**Type Guard Function**:
```typescript
function isRecordingEvent<T extends RecordingEventType>(
  event: RecordingEvent,
  type: T
): event is Extract<RecordingEvent, { type: T }> {
  return event.type === type
}
```

**Usage Example**:
```typescript
function handleEvent(event: RecordingEvent) {
  if (isRecordingEvent(event, 'recording:started')) {
    console.log('Recording started at', event.timestamp)
  }
}
```

### 3. Preload API (`src/renderer/types/api.ts`)

#### RecorderAPI
The interface exposed to the renderer process:
```typescript
interface RecorderAPI {
  // Recording control
  startRecording(options: RecordingOptions): Promise<void>
  stopRecording(): Promise<ArrayBuffer>      // IPC serializable
  pauseRecording(): Promise<void>
  resumeRecording(): Promise<void>

  // State queries
  getState(): Promise<RecorderState>
  getSources(): Promise<CaptureSource[]>

  // Event subscription
  onRecordingEvent(callback: (event: RecordingEvent) => void): () => void
}
```

**Key Points**:
- All methods are async (IPC overhead)
- `stopRecording()` returns `ArrayBuffer` (IPC serializable) instead of `Blob`
- Event callbacks return unsubscribe functions
- No method can be called during `'stopping'` state

#### Window Extension
Global type extension:
```typescript
declare global {
  interface Window {
    recorderAPI: RecorderAPI
  }
}
```

#### Helper Functions

**isRecorderAPIAvailable()**:
```typescript
function isRecorderAPIAvailable(): boolean {
  return typeof window !== 'undefined' && 'recorderAPI' in window
}
```

**getRecorderAPI()**:
```typescript
function getRecorderAPI(): RecorderAPI {
  if (!isRecorderAPIAvailable()) {
    throw new Error(
      'RecorderAPI not available. Ensure preload script is loaded correctly.'
    )
  }
  return window.recorderAPI
}
```

### 4. Barrel Exports (`src/renderer/types/index.ts`)

Unified import point for all types:
```typescript
// Core types
export type {
  CaptureMode,
  CropArea,
  RecordingOptions,
  RecorderStatus,
  RecorderState,
  CaptureSource,
  IRecorder
}

// Constants
export {
  DEFAULT_RECORDING_OPTIONS,
  INITIAL_RECORDER_STATE
}

// Event types
export type {
  RecordingStartedEvent,
  RecordingStoppedEvent,
  RecordingPausedEvent,
  RecordingResumedEvent,
  RecordingErrorEvent,
  RecordingChunkEvent,
  RecordingStateChangeEvent,
  RecordingEvent,
  RecordingEventType
}

// Event utilities
export { isRecordingEvent }

// API types
export type { RecorderAPI }

export {
  isRecorderAPIAvailable,
  getRecorderAPI
}
```

## Usage Examples

### Example 1: Basic Recording

```typescript
import { getRecorderAPI, type RecordingOptions } from '@/types'

const api = getRecorderAPI()

// Start recording
const options: RecordingOptions = {
  captureMode: 'fullscreen',
  includeSystemAudio: true,
  framerate: 60
}

await api.startRecording(options)

// Subscribe to events
const unsubscribe = api.onRecordingEvent((event) => {
  if (event.type === 'recording:stateChange') {
    console.log(`Duration: ${event.duration}s, Size: ${event.fileSize} bytes`)
  }
})

// Stop recording
await new Promise(resolve => setTimeout(resolve, 5000))
const arrayBuffer = await api.stopRecording()

// Cleanup
unsubscribe()
```

### Example 2: Area Capture

```typescript
import { getRecorderAPI, type RecordingOptions, CropArea } from '@/types'

const api = getRecorderAPI()

const area: CropArea = {
  x: 100,
  y: 100,
  width: 800,
  height: 600
}

const options: RecordingOptions = {
  captureMode: 'area',
  area: area,
  videoBitsPerSecond: 3000000
}

await api.startRecording(options)
```

### Example 3: Window Capture

```typescript
import { getRecorderAPI, type RecordingOptions } from '@/types'

const api = getRecorderAPI()

// Get available windows
const sources = await api.getSources()
const targetWindow = sources.find(s => s.name.includes('VS Code'))

if (targetWindow) {
  const options: RecordingOptions = {
    captureMode: 'window',
    windowId: targetWindow.id,
    includeMicrophone: true
  }

  await api.startRecording(options)
}
```

### Example 4: Event Handling

```typescript
import {
  getRecorderAPI,
  isRecordingEvent,
  type RecordingEvent
} from '@/types'

const api = getRecorderAPI()

const unsubscribe = api.onRecordingEvent((event: RecordingEvent) => {
  if (isRecordingEvent(event, 'recording:started')) {
    console.log('Recording started')
  } else if (isRecordingEvent(event, 'recording:error')) {
    console.error(`Recording error: ${event.error} (${event.code})`)
  } else if (isRecordingEvent(event, 'recording:stopped')) {
    console.log(`Stopped. Duration: ${event.duration}s`)
    // Convert ArrayBuffer to Blob
    const blob = new Blob([event.blob])
    downloadRecording(blob)
  }
})
```

## Design Principles

### 1. Platform Agnostic
- No Electron imports in type files
- Interface-based design allows Tauri implementation
- Core logic separated from platform specifics

### 2. Type Safety
- All types exported from single barrel file
- Discriminated unions for event handling
- Type guards for runtime safety

### 3. Async IPC First
- All API methods async-first
- Serializable types (no Blob over IPC)
- Unsubscribe pattern for event cleanup

### 4. Clear State Semantics
- Single source of truth: `RecorderState`
- State transition rules enforced
- No invalid state combinations possible

### 5. Error Handling
- Structured error codes
- Optional error details in state
- Event-based error propagation

## Implementation Roadmap

### Phase 03: IPC Communication & Main Process
- Implement `ElectronRecorder` class
- Expose `RecorderAPI` via preload
- Handle state transitions
- Emit events to renderer

### Phase 04: Video Processing
- Implement video encoding
- Handle audio mixing
- Blob/buffer conversions

### Phase 05: Settings Integration
- Persist recording preferences
- Apply user defaults to `RecordingOptions`

### Phase 06: UI Controls
- Create recording button component
- Integrate with state updates
- Handle pause/resume UI

### Phase 07: Source Selection
- Implement source picker
- Window/screen selection UI
- Thumbnail generation

### Phase 08: Advanced Features
- Chunk-based recording
- Memory optimization
- Multi-format export

## Testing Strategy

### Unit Tests (Phase 09)
```typescript
describe('RecordingOptions validation', () => {
  it('should require windowId for window mode', () => {
    const options: RecordingOptions = {
      captureMode: 'window'
    }
    expect(() => validateOptions(options)).toThrow()
  })
})
```

### Integration Tests (Phase 09)
```typescript
describe('RecorderAPI', () => {
  it('should handle recording lifecycle', async () => {
    await api.startRecording(options)
    const state = await api.getState()
    expect(state.status).toBe('recording')
  })
})
```

### Type Safety Tests (Phase 09)
- Verify discriminated union type narrowing
- Test event type guards
- Validate API contract enforcement

## Related Documentation

- **ARCHITECTURE.md** - System architecture and process model
- **DEVELOPMENT_GUIDE.md** - Code standards and best practices
- **PHASE_ROADMAP.md** - Overall project timeline
- **PHASE_03_IMPLEMENTATION.md** (upcoming) - Main/Preload implementation

## Files Modified/Created

**Created**:
- `src/renderer/types/recorder.ts` - Core recorder types
- `src/renderer/types/events.ts` - Recording event types
- `src/renderer/types/api.ts` - Preload API interface
- `src/renderer/types/index.ts` - Barrel exports

**References**:
- `src/preload/index.ts` - Will implement RecorderAPI
- `src/main/index.ts` - Will implement IRecorder
- React components - Will use RecorderAPI

## Completion Checklist

- [x] Core recorder types defined
- [x] Event system designed with discriminated unions
- [x] Preload API interface defined
- [x] Type guard utilities implemented
- [x] Helper functions for API access
- [x] Platform-agnostic design confirmed
- [x] Documentation completed
- [x] Examples provided
- [x] Integration plan defined

## Next Steps

1. **Phase 03**: Implement preload script to expose RecorderAPI
2. **Phase 03**: Implement ElectronRecorder in main process
3. **Phase 03**: Wire up IPC handlers for all RecorderAPI methods
4. **Phase 03**: Implement event emission to renderer

---

**Last Updated**: 2026-01-04
**Phase Status**: COMPLETED
**Type System Version**: 1.0.0
**TypeScript Target**: ES2020, with strict mode enabled
