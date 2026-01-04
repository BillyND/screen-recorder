# Screen Recorder

A modern Windows desktop application for screen recording built with Electron, React, and TypeScript.

## Project Overview

Screen Recorder is a lightweight, user-friendly application designed to capture video and audio from your Windows screen. Built with cutting-edge technologies, it provides a streamlined interface for recording, managing, and exporting screen recordings.

### Key Features (Planned)
- High-quality screen capture with customizable resolution
- Audio recording from system and microphone sources
- Real-time preview and recording controls
- Video editing and trimming capabilities
- Multiple export formats support
- Minimal system resource usage

### Technology Stack
- **Desktop Framework**: Electron 33.0+
- **UI Framework**: React 18.3+
- **Language**: TypeScript 5.6+
- **Build Tools**: Vite 5.4+, electron-vite 2.3+
- **Package Manager**: npm
- **Distribution**: electron-builder 25.0+

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Git
- Windows 10 or later

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd screen-recorder
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The application will open with hot reload enabled. DevTools will be automatically opened for debugging.

## Development

### Available Commands

```bash
# Start development server with hot reload and DevTools
npm run dev

# Build application for production
npm run build

# Build Windows installer
npm run build:win

# Preview production build
npm run preview

# Type check without emitting
npm run typecheck
```

### Project Structure

```
screen-recorder/
├── src/
│   ├── main/              # Electron main process
│   │   └── index.ts       # App initialization, window creation
│   ├── preload/           # Preload script (context bridge)
│   │   └── index.ts       # IPC API exposure to renderer
│   └── renderer/          # React application
│       ├── App.tsx        # Main app component
│       ├── index.tsx      # React root mount
│       ├── index.html     # HTML entry point
│       ├── styles.css     # Global styles
│       ├── components/    # React components (placeholder)
│       ├── hooks/         # Custom React hooks (placeholder)
│       ├── workers/       # Web workers for heavy tasks
│       └── types/         # TypeScript type definitions
├── dist/                  # Build output directory
│   ├── main/              # Compiled main process
│   ├── preload/           # Compiled preload script
│   └── renderer/          # Compiled React application
├── public/                # Public assets (icons, etc.)
├── docs/                  # Documentation
├── electron.vite.config.ts   # Build configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Project metadata and dependencies
└── README.md             # This file
```

### Architecture Overview

**Three-Process Model:**

1. **Main Process** (`src/main/index.ts`)
   - Manages application lifecycle
   - Creates and controls BrowserWindow
   - Handles system-level events
   - Communicates with preload/renderer via IPC

2. **Preload Script** (`src/preload/index.ts`)
   - Runs in privileged context before renderer loads
   - Exposes safe IPC APIs via context bridge
   - Type-safe API definition with TypeScript
   - Currently placeholder for Phase 03 implementation

3. **Renderer Process** (`src/renderer/`)
   - React-based UI layer
   - Communicates with main process through exposed APIs
   - No direct Node.js/Electron access
   - Sandboxed for security

### Configuration Details

**electron.vite.config.ts**
- Configures separate builds for main, preload, and renderer
- Sets up React plugin and path aliases
- Uses `base: './'` for Windows file:// protocol support
- All preload and main process external to Electron

**tsconfig.json**
- Target: ES2022 with modern JavaScript features
- Strict mode enabled for type safety
- DOM and Iterable library support
- Path alias support (@/* for renderer imports)

## Phase Progress

### Phase 01: Project Setup (COMPLETED)
- Electron + Vite infrastructure configured
- React 18 and TypeScript 5 setup
- Build pipeline established
- Development environment ready
- Basic window creation and rendering
- Security context isolation enabled
- Path aliases configured

### Upcoming Phases
- **Phase 02**: UI Layout and Styling
- **Phase 03**: Recording API & IPC Communication
- **Phase 04**: Video Processing and Storage
- **Phase 05**: Recording Controls and Lifecycle
- **Phase 06**: Settings and Preferences
- **Phase 07**: Recording Controls UI
- ... and more

## Building for Distribution

### Windows Build

Create a Windows installer:

```bash
npm run build:win
```

This will:
1. Build the application with Vite
2. Package with electron-builder
3. Generate NSIS installer in `release/` directory

**Build Configuration** (from package.json):
- App ID: `com.screen-recorder.app`
- Product Name: `Screen Recorder`
- Target: NSIS installer
- Output: `release/` directory

## Security Considerations

- **Context Isolation**: Enabled - main and renderer processes are isolated
- **Sandbox**: Enabled - renderer process runs in sandbox
- **Node Integration**: Disabled - no direct Node.js access from renderer
- **Preload**: Used for controlled IPC exposure
- **Content Security**: TypeScript strict mode prevents type-related vulnerabilities

## Development Workflow

1. **Hot Reload**: Changes to renderer code automatically reload
2. **DevTools**: Opens automatically in development mode
3. **Type Safety**: Run `npm run typecheck` before commits
4. **Build**: Test production build with `npm run build`

## Troubleshooting

### Common Issues

**Port 5173 already in use**
```bash
# Change port in electron.vite.config.ts or kill the process
npx kill-port 5173
```

**Native modules not building**
```bash
npm run build  # Full rebuild
```

**DevTools not opening**
- Check if DevTools is enabled in `src/main/index.ts`
- Only enabled in development mode

## Contributing

When contributing:
1. Follow TypeScript strict mode guidelines
2. Use path aliases (@/) for renderer imports
3. Test both dev and production builds
4. Update documentation for significant changes
5. Follow the project's phase-based development plan

## License

[Add license information]

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [electron-vite Documentation](https://electron-vite.org)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Last Updated**: 2026-01-04
**Phase**: 01 - Project Setup (Completed)
