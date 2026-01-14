# EVMIX Frontend Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core frontend visualization with State Dashboard and Time-Travel Timeline.

**Architecture:** React SPA consuming evmix-core via a DebugSession wrapper. The DebugSession manages execution state, snapshots for time-travel, and emits events for UI updates. Components are split into panels (Stack, Memory, Storage) and controls (Timeline, Playback). Designed to accept trace data from any source (local execution now, mainnet replay later).

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Zustand (state management), Framer Motion (animations)

---

## Task 1: Create evmix-ui Package

**Files:**
- Create: `packages/evmix-ui/package.json`
- Create: `packages/evmix-ui/tsconfig.json`
- Create: `packages/evmix-ui/vite.config.ts`
- Create: `packages/evmix-ui/index.html`
- Create: `packages/evmix-ui/src/main.tsx`
- Create: `packages/evmix-ui/src/App.tsx`
- Create: `packages/evmix-ui/src/index.css`
- Create: `packages/evmix-ui/tailwind.config.js`
- Create: `packages/evmix-ui/postcss.config.js`

**Step 1: Create package.json**

```json
{
  "name": "evmix-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.0.0",
    "evmix-core": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

**Step 5: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        evmix: {
          bg: '#0d1117',
          panel: '#161b22',
          border: '#30363d',
          text: '#c9d1d9',
          muted: '#8b949e',
          accent: '#58a6ff',
          success: '#3fb950',
          warning: '#d29922',
          error: '#f85149',
        },
      },
    },
  },
  plugins: [],
}
```

**Step 6: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 7: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EVMIX Lab</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 8: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-evmix-bg text-evmix-text font-mono;
  margin: 0;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}
```

**Step 9: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 10: Create src/App.tsx**

```tsx
export default function App() {
  return (
    <div className="min-h-screen p-4">
      <h1 className="text-2xl font-bold text-evmix-accent">EVMIX Lab</h1>
      <p className="text-evmix-muted mt-2">Frontend scaffolding complete.</p>
    </div>
  )
}
```

**Step 11: Install dependencies and verify**

```bash
cd packages/evmix-ui && npm install
```

**Step 12: Run dev server to verify**

```bash
cd packages/evmix-ui && npm run dev
```

Expected: Vite dev server starts, browser shows "EVMIX Lab" heading.

**Step 13: Commit**

```bash
git add packages/evmix-ui
git commit -m "feat(ui): scaffold evmix-ui package with React + Vite + Tailwind"
```

---

## Task 2: Create DebugSession - The Execution Engine Wrapper

**Files:**
- Create: `packages/evmix-ui/src/lib/DebugSession.ts`
- Create: `packages/evmix-ui/src/lib/types.ts`

**Purpose:** DebugSession wraps the evmix-core Interpreter and provides:
- Step forward/backward execution
- Snapshot management for time-travel
- Current state accessors
- Event subscriptions for UI updates

**Step 1: Create src/lib/types.ts**

```typescript
import type { TraceEvent, HaltReason } from 'evmix-core'

/**
 * A snapshot of execution state at a specific point
 */
export interface ExecutionSnapshot {
  stepIndex: number
  pc: number
  gasRemaining: bigint
  stack: string[] // hex values
  memorySize: number
  memory: Uint8Array
  halted: boolean
  haltReason?: HaltReason
}

/**
 * Configuration for creating a debug session
 */
export interface DebugSessionConfig {
  bytecode: Uint8Array
  initialGas: bigint
  calldata?: Uint8Array
  // Host config for mainnet replay (future)
  hostConfig?: {
    address?: string
    caller?: string
    origin?: string
    value?: bigint
    blockNumber?: bigint
    timestamp?: bigint
    chainId?: bigint
  }
}

/**
 * Trace data source - abstraction for where trace comes from
 * This allows swapping local execution for mainnet replay later
 */
export interface TraceSource {
  getEvents(): TraceEvent[]
  getSnapshot(stepIndex: number): ExecutionSnapshot
  getTotalSteps(): number
}
```

**Step 2: Create src/lib/DebugSession.ts**

```typescript
import {
  Interpreter,
  TraceEvent,
  TraceCollector,
  HaltReason,
  Word256,
  Address,
} from 'evmix-core'
import { MemoryHost } from 'evmix-core/src/host/MemoryHost'
import type { ExecutionSnapshot, DebugSessionConfig, TraceSource } from './types'

const SNAPSHOT_INTERVAL = 50 // Take snapshot every N steps

/**
 * DebugSession - Manages EVM execution with time-travel support
 *
 * Provides:
 * - Step-by-step execution
 * - Time-travel via snapshots
 * - State accessors for UI
 */
export class DebugSession implements TraceSource {
  private interpreter: Interpreter
  private trace: TraceCollector
  private snapshots: Map<number, ExecutionSnapshot> = new Map()
  private currentStep: number = 0
  private totalSteps: number = 0
  private bytecode: Uint8Array
  private config: DebugSessionConfig
  private executed: boolean = false

  constructor(config: DebugSessionConfig) {
    this.config = config
    this.bytecode = config.bytecode

    const host = new MemoryHost({
      address: config.hostConfig?.address
        ? Address.fromHex(config.hostConfig.address)
        : undefined,
      msgContext: {
        caller: config.hostConfig?.caller
          ? Address.fromHex(config.hostConfig.caller)
          : Address.zero(),
        value: config.hostConfig?.value ?? 0n,
      },
      txContext: {
        origin: config.hostConfig?.origin
          ? Address.fromHex(config.hostConfig.origin)
          : Address.zero(),
        gasPrice: 0n,
      },
      blockContext: {
        number: config.hostConfig?.blockNumber ?? 0n,
        timestamp: config.hostConfig?.timestamp ?? BigInt(Date.now() / 1000),
        chainId: config.hostConfig?.chainId ?? 1n,
        coinbase: Address.zero(),
        difficulty: 0n,
        gasLimit: 30_000_000n,
        baseFee: 0n,
      },
    })

    this.interpreter = new Interpreter({
      bytecode: config.bytecode,
      initialGas: config.initialGas,
      calldata: config.calldata,
      host,
    })

    this.trace = this.interpreter.getTrace()
  }

  /**
   * Execute the entire program and capture snapshots
   */
  runToCompletion(): void {
    if (this.executed) return

    // Take initial snapshot
    this.captureSnapshot(0)

    let step = 0
    while (!this.interpreter.isHalted()) {
      this.interpreter.step()
      step++

      // Take periodic snapshots
      if (step % SNAPSHOT_INTERVAL === 0) {
        this.captureSnapshot(step)
      }
    }

    // Final snapshot
    this.captureSnapshot(step)
    this.totalSteps = step
    this.currentStep = step
    this.executed = true
  }

  /**
   * Capture a snapshot of current state
   */
  private captureSnapshot(stepIndex: number): void {
    const state = this.interpreter.getState()
    const stack = this.interpreter.getStack()

    const snapshot: ExecutionSnapshot = {
      stepIndex,
      pc: state.pc,
      gasRemaining: state.gasRemaining,
      stack: stack.toArray().map((w) => w.toHexWith0x()),
      memorySize: state.memory.length,
      memory: new Uint8Array(state.memory),
      halted: state.halted,
      haltReason: state.haltReason,
    }

    this.snapshots.set(stepIndex, snapshot)
  }

  /**
   * Get snapshot at a specific step (reconstructs if not cached)
   */
  getSnapshot(stepIndex: number): ExecutionSnapshot {
    // Clamp to valid range
    stepIndex = Math.max(0, Math.min(stepIndex, this.totalSteps))

    // Check cache
    if (this.snapshots.has(stepIndex)) {
      return this.snapshots.get(stepIndex)!
    }

    // Find nearest earlier snapshot and reconstruct
    let nearestStep = 0
    for (const [step] of this.snapshots) {
      if (step <= stepIndex && step > nearestStep) {
        nearestStep = step
      }
    }

    // Reconstruct state by replaying from nearest snapshot
    // For MVP, we'll just return the nearest snapshot
    // Full implementation would re-execute from snapshot
    return this.snapshots.get(nearestStep)!
  }

  /**
   * Get all trace events
   */
  getEvents(): TraceEvent[] {
    return this.trace.getEvents()
  }

  /**
   * Get events up to a specific step
   */
  getEventsUpTo(stepIndex: number): TraceEvent[] {
    const events = this.trace.getEvents()
    // Find events where the step (based on opcode.start events) <= stepIndex
    let opcodeCount = 0
    const result: TraceEvent[] = []

    for (const event of events) {
      result.push(event)
      if (event.type === 'opcode.start') {
        opcodeCount++
        if (opcodeCount > stepIndex) break
      }
    }

    return result
  }

  /**
   * Get total number of execution steps
   */
  getTotalSteps(): number {
    return this.totalSteps
  }

  /**
   * Get current step index
   */
  getCurrentStep(): number {
    return this.currentStep
  }

  /**
   * Set current step (for time-travel)
   */
  setCurrentStep(step: number): void {
    this.currentStep = Math.max(0, Math.min(step, this.totalSteps))
  }

  /**
   * Get bytecode
   */
  getBytecode(): Uint8Array {
    return this.bytecode
  }

  /**
   * Check if execution is complete
   */
  isComplete(): boolean {
    return this.executed
  }
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd packages/evmix-ui && npm run typecheck
```

Expected: No errors (may need to fix import paths)

**Step 4: Commit**

```bash
git add packages/evmix-ui/src/lib
git commit -m "feat(ui): add DebugSession execution wrapper with time-travel support"
```

---

## Task 3: Create Zustand Store for UI State

**Files:**
- Create: `packages/evmix-ui/src/store/debugStore.ts`

**Purpose:** Central state management connecting DebugSession to React components.

**Step 1: Create src/store/debugStore.ts**

```typescript
import { create } from 'zustand'
import { DebugSession } from '../lib/DebugSession'
import type { ExecutionSnapshot, DebugSessionConfig } from '../lib/types'
import type { TraceEvent } from 'evmix-core'

interface DebugState {
  // Session
  session: DebugSession | null
  isLoading: boolean
  error: string | null

  // Playback
  currentStep: number
  totalSteps: number
  isPlaying: boolean
  playbackSpeed: number // steps per second

  // Current state view
  snapshot: ExecutionSnapshot | null
  events: TraceEvent[]

  // Actions
  loadBytecode: (config: DebugSessionConfig) => void
  setStep: (step: number) => void
  stepForward: () => void
  stepBackward: () => void
  play: () => void
  pause: () => void
  setPlaybackSpeed: (speed: number) => void
  reset: () => void
}

export const useDebugStore = create<DebugState>((set, get) => ({
  // Initial state
  session: null,
  isLoading: false,
  error: null,
  currentStep: 0,
  totalSteps: 0,
  isPlaying: false,
  playbackSpeed: 5,
  snapshot: null,
  events: [],

  // Load and execute bytecode
  loadBytecode: (config: DebugSessionConfig) => {
    set({ isLoading: true, error: null })

    try {
      const session = new DebugSession(config)
      session.runToCompletion()

      const totalSteps = session.getTotalSteps()
      const snapshot = session.getSnapshot(0)
      const events = session.getEventsUpTo(0)

      set({
        session,
        isLoading: false,
        currentStep: 0,
        totalSteps,
        snapshot,
        events,
      })
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  },

  // Set current step (time-travel)
  setStep: (step: number) => {
    const { session } = get()
    if (!session) return

    const clampedStep = Math.max(0, Math.min(step, session.getTotalSteps()))
    const snapshot = session.getSnapshot(clampedStep)
    const events = session.getEventsUpTo(clampedStep)

    set({ currentStep: clampedStep, snapshot, events })
  },

  stepForward: () => {
    const { currentStep, totalSteps, setStep } = get()
    if (currentStep < totalSteps) {
      setStep(currentStep + 1)
    }
  },

  stepBackward: () => {
    const { currentStep, setStep } = get()
    if (currentStep > 0) {
      setStep(currentStep - 1)
    }
  },

  play: () => {
    set({ isPlaying: true })
    const tick = () => {
      const { isPlaying, currentStep, totalSteps, stepForward, playbackSpeed } = get()
      if (!isPlaying || currentStep >= totalSteps) {
        set({ isPlaying: false })
        return
      }
      stepForward()
      setTimeout(tick, 1000 / playbackSpeed)
    }
    tick()
  },

  pause: () => {
    set({ isPlaying: false })
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed })
  },

  reset: () => {
    const { setStep } = get()
    setStep(0)
    set({ isPlaying: false })
  },
}))
```

**Step 2: Verify TypeScript**

```bash
cd packages/evmix-ui && npm run typecheck
```

**Step 3: Commit**

```bash
git add packages/evmix-ui/src/store
git commit -m "feat(ui): add Zustand store for debug session state management"
```

---

## Task 4: Create Stack Panel Component

**Files:**
- Create: `packages/evmix-ui/src/components/panels/StackPanel.tsx`

**Step 1: Create src/components/panels/StackPanel.tsx**

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../../store/debugStore'

/**
 * Format a hex value for display
 * Shows full value but truncates middle for long values
 */
function formatHex(hex: string): { display: string; full: string } {
  if (hex.length <= 18) {
    return { display: hex, full: hex }
  }
  const display = `${hex.slice(0, 10)}...${hex.slice(-6)}`
  return { display, full: hex }
}

/**
 * Guess the type of a stack value based on its pattern
 */
function guessType(hex: string): string | null {
  const value = BigInt(hex)

  // Check if it looks like an address (20 bytes, fits in 160 bits)
  if (hex.length === 42 && value < 2n ** 160n && value > 2n ** 128n) {
    return 'address?'
  }

  // Check if it's a small number
  if (value < 1000n) {
    return `(${value})`
  }

  // Check if it could be wei (common ETH amounts)
  if (value >= 10n ** 15n && value < 10n ** 24n) {
    const eth = Number(value) / 1e18
    if (eth < 1000) {
      return `~${eth.toFixed(4)} ETH`
    }
  }

  return null
}

export function StackPanel() {
  const snapshot = useDebugStore((s) => s.snapshot)

  if (!snapshot) {
    return (
      <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-evmix-muted mb-3">STACK</h2>
        <p className="text-evmix-muted text-sm">No execution loaded</p>
      </div>
    )
  }

  const stack = snapshot.stack

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        STACK <span className="text-evmix-accent">({stack.length})</span>
      </h2>

      {stack.length === 0 ? (
        <p className="text-evmix-muted text-sm italic">Empty</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {[...stack].reverse().map((value, i) => {
              const formatted = formatHex(value)
              const typeHint = guessType(value)
              const stackIndex = stack.length - 1 - i

              return (
                <motion.div
                  key={`${stackIndex}-${value}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="group flex items-center gap-2 bg-evmix-bg rounded px-2 py-1"
                >
                  <span className="text-evmix-muted text-xs w-6">
                    {stackIndex}
                  </span>
                  <code
                    className="text-xs text-evmix-text flex-1 truncate"
                    title={formatted.full}
                  >
                    {formatted.display}
                  </code>
                  {typeHint && (
                    <span className="text-xs text-evmix-muted">{typeHint}</span>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add packages/evmix-ui/src/components
git commit -m "feat(ui): add StackPanel component with animations"
```

---

## Task 5: Create Memory Panel Component

**Files:**
- Create: `packages/evmix-ui/src/components/panels/MemoryPanel.tsx`

**Step 1: Create src/components/panels/MemoryPanel.tsx**

```tsx
import { useState } from 'react'
import { useDebugStore } from '../../store/debugStore'

/**
 * Format bytes as hex string
 */
function bytesToHex(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.slice(start, start + length)
  return Array.from(slice)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

/**
 * Format bytes as ASCII (printable chars only)
 */
function bytesToAscii(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.slice(start, start + length)
  return Array.from(slice)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('')
}

const BYTES_PER_ROW = 16

export function MemoryPanel() {
  const snapshot = useDebugStore((s) => s.snapshot)
  const [showAscii, setShowAscii] = useState(true)

  if (!snapshot) {
    return (
      <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-evmix-muted mb-3">MEMORY</h2>
        <p className="text-evmix-muted text-sm">No execution loaded</p>
      </div>
    )
  }

  const memory = snapshot.memory
  const rowCount = Math.ceil(memory.length / BYTES_PER_ROW)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-evmix-muted">
          MEMORY{' '}
          <span className="text-evmix-accent">({memory.length} bytes)</span>
        </h2>
        <button
          onClick={() => setShowAscii(!showAscii)}
          className="text-xs text-evmix-muted hover:text-evmix-accent"
        >
          {showAscii ? 'Hide ASCII' : 'Show ASCII'}
        </button>
      </div>

      {memory.length === 0 ? (
        <p className="text-evmix-muted text-sm italic">Empty</p>
      ) : (
        <div className="font-mono text-xs max-h-60 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="text-evmix-muted">
                <th className="text-left pr-4 pb-1">Offset</th>
                <th className="text-left pb-1">Hex</th>
                {showAscii && <th className="text-left pl-4 pb-1">ASCII</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, row) => {
                const offset = row * BYTES_PER_ROW
                const hex = bytesToHex(memory, offset, BYTES_PER_ROW)
                const ascii = bytesToAscii(memory, offset, BYTES_PER_ROW)

                return (
                  <tr key={offset} className="hover:bg-evmix-bg">
                    <td className="text-evmix-muted pr-4 py-0.5">
                      {offset.toString(16).padStart(4, '0')}
                    </td>
                    <td className="text-evmix-text py-0.5">{hex}</td>
                    {showAscii && (
                      <td className="text-evmix-muted pl-4 py-0.5">{ascii}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add packages/evmix-ui/src/components/panels/MemoryPanel.tsx
git commit -m "feat(ui): add MemoryPanel component with hex dump view"
```

---

## Task 6: Create Storage Panel Component

**Files:**
- Create: `packages/evmix-ui/src/components/panels/StoragePanel.tsx`

**Step 1: Create src/components/panels/StoragePanel.tsx**

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../../store/debugStore'
import type { StorageWriteEvent, StorageReadEvent } from 'evmix-core'

/**
 * Extract storage state from events
 */
function buildStorageState(
  events: (StorageWriteEvent | StorageReadEvent)[]
): Map<string, { key: string; value: string; isNew: boolean }> {
  const storage = new Map<string, { key: string; value: string; isNew: boolean }>()

  for (const event of events) {
    if (event.type === 'storage.write') {
      const existing = storage.has(event.key)
      storage.set(event.key, {
        key: event.key,
        value: event.value,
        isNew: !existing,
      })
    }
  }

  return storage
}

function formatHex(hex: string): string {
  if (hex.length <= 18) return hex
  return `${hex.slice(0, 10)}...${hex.slice(-6)}`
}

export function StoragePanel() {
  const events = useDebugStore((s) => s.events)

  const storageEvents = events.filter(
    (e) => e.type === 'storage.write' || e.type === 'storage.read'
  ) as (StorageWriteEvent | StorageReadEvent)[]

  const storageState = buildStorageState(storageEvents)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        STORAGE{' '}
        <span className="text-evmix-accent">({storageState.size} slots)</span>
      </h2>

      {storageState.size === 0 ? (
        <p className="text-evmix-muted text-sm italic">No storage accessed</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {Array.from(storageState.values()).map(({ key, value, isNew }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`flex items-center gap-2 rounded px-2 py-1 ${
                  isNew ? 'bg-evmix-success/10' : 'bg-evmix-bg'
                }`}
              >
                <code
                  className="text-xs text-evmix-muted truncate w-24"
                  title={key}
                >
                  {formatHex(key)}
                </code>
                <span className="text-evmix-muted">→</span>
                <code
                  className="text-xs text-evmix-text truncate flex-1"
                  title={value}
                >
                  {formatHex(value)}
                </code>
                {isNew && (
                  <span className="text-xs text-evmix-success">NEW</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add packages/evmix-ui/src/components/panels/StoragePanel.tsx
git commit -m "feat(ui): add StoragePanel component with write tracking"
```

---

## Task 7: Create Timeline Component

**Files:**
- Create: `packages/evmix-ui/src/components/Timeline.tsx`

**Step 1: Create src/components/Timeline.tsx**

```tsx
import { useDebugStore } from '../store/debugStore'
import type { TraceEvent } from 'evmix-core'

/**
 * Get marker type and color for an event
 */
function getEventMarker(event: TraceEvent): { color: string; label: string } | null {
  switch (event.type) {
    case 'jump':
      return { color: 'bg-evmix-accent', label: 'JUMP' }
    case 'storage.write':
      return { color: 'bg-evmix-warning', label: 'SSTORE' }
    case 'log':
      return { color: 'bg-purple-500', label: 'LOG' }
    case 'halt':
      return { color: 'bg-evmix-error', label: 'HALT' }
    default:
      return null
  }
}

export function Timeline() {
  const {
    currentStep,
    totalSteps,
    setStep,
    isPlaying,
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    playbackSpeed,
    setPlaybackSpeed,
    events,
  } = useDebugStore()

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  // Get notable events for markers
  const markers = events
    .filter((e) => getEventMarker(e) !== null)
    .map((e) => ({
      event: e,
      marker: getEventMarker(e)!,
      // Approximate position based on event index
      position: (e.index / Math.max(events.length, 1)) * 100,
    }))

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      {/* Playback Controls */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={reset}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Reset"
        >
          ⏮
        </button>
        <button
          onClick={stepBackward}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Step Back"
          disabled={currentStep === 0}
        >
          ◀
        </button>
        <button
          onClick={isPlaying ? pause : play}
          className="p-2 hover:bg-evmix-bg rounded text-evmix-accent"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={stepForward}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Step Forward"
          disabled={currentStep >= totalSteps}
        >
          ▶
        </button>
        <button
          onClick={() => setStep(totalSteps)}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Go to End"
        >
          ⏭
        </button>

        <div className="flex-1" />

        {/* Speed Control */}
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="bg-evmix-bg border border-evmix-border rounded px-2 py-1 text-sm"
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
          <option value={10}>10x</option>
          <option value={20}>20x</option>
        </select>

        {/* Step Counter */}
        <span className="text-sm text-evmix-muted">
          Step {currentStep} / {totalSteps}
        </span>
      </div>

      {/* Timeline Scrubber */}
      <div className="relative h-8">
        {/* Track */}
        <div className="absolute inset-y-2 left-0 right-0 bg-evmix-bg rounded">
          {/* Progress */}
          <div
            className="h-full bg-evmix-accent/30 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Event Markers */}
        {markers.map(({ event, marker, position }, i) => (
          <div
            key={`${event.type}-${i}`}
            className={`absolute top-0 w-1 h-3 ${marker.color} rounded`}
            style={{ left: `${position}%` }}
            title={marker.label}
          />
        ))}

        {/* Scrubber Handle */}
        <input
          type="range"
          min={0}
          max={totalSteps}
          value={currentStep}
          onChange={(e) => setStep(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />

        {/* Playhead */}
        <div
          className="absolute top-1 w-2 h-6 bg-evmix-accent rounded shadow-lg"
          style={{ left: `calc(${progress}% - 4px)` }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-evmix-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-evmix-accent rounded" /> Jump
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-evmix-warning rounded" /> Storage
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-purple-500 rounded" /> Log
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-evmix-error rounded" /> Halt
        </span>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add packages/evmix-ui/src/components/Timeline.tsx
git commit -m "feat(ui): add Timeline component with scrubber and event markers"
```

---

## Task 8: Create Bytecode Input Component

**Files:**
- Create: `packages/evmix-ui/src/components/BytecodeInput.tsx`

**Step 1: Create src/components/BytecodeInput.tsx**

```tsx
import { useState } from 'react'
import { useDebugStore } from '../store/debugStore'

// Example bytecodes for quick testing
const EXAMPLES = [
  {
    name: 'Simple Add',
    bytecode: '6005600401',
    description: 'PUSH1 5, PUSH1 4, ADD → 9 on stack',
  },
  {
    name: 'Storage Write',
    bytecode: '602a60005500',
    description: 'Store 42 at slot 0',
  },
  {
    name: 'Loop (5 iterations)',
    bytecode: '6005600080600190039160055780600057',
    description: 'Count down from 5 to 0',
  },
]

export function BytecodeInput() {
  const [input, setInput] = useState('')
  const [gas, setGas] = useState('1000000')
  const { loadBytecode, isLoading, error } = useDebugStore()

  const handleLoad = () => {
    // Parse hex string to bytes
    const cleanHex = input.replace(/^0x/, '').replace(/\s/g, '')
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      alert('Invalid hex string')
      return
    }

    const bytes = new Uint8Array(
      cleanHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []
    )

    loadBytecode({
      bytecode: bytes,
      initialGas: BigInt(gas),
    })
  }

  const loadExample = (hex: string) => {
    setInput(hex)
  }

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        LOAD BYTECODE
      </h2>

      {/* Examples */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => loadExample(ex.bytecode)}
            className="text-xs bg-evmix-bg hover:bg-evmix-border px-2 py-1 rounded"
            title={ex.description}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter bytecode (hex)..."
        className="w-full h-20 bg-evmix-bg border border-evmix-border rounded p-2 text-sm font-mono resize-none"
      />

      {/* Gas Input */}
      <div className="flex items-center gap-2 mt-2">
        <label className="text-sm text-evmix-muted">Gas:</label>
        <input
          type="number"
          value={gas}
          onChange={(e) => setGas(e.target.value)}
          className="w-32 bg-evmix-bg border border-evmix-border rounded px-2 py-1 text-sm"
        />
      </div>

      {/* Load Button */}
      <button
        onClick={handleLoad}
        disabled={isLoading || !input}
        className="mt-4 w-full bg-evmix-accent hover:bg-evmix-accent/80 text-black font-semibold py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Load & Execute'}
      </button>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-evmix-error">{error}</p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add packages/evmix-ui/src/components/BytecodeInput.tsx
git commit -m "feat(ui): add BytecodeInput component with example programs"
```

---

## Task 9: Create Gas Meter Component

**Files:**
- Create: `packages/evmix-ui/src/components/GasMeter.tsx`

**Step 1: Create src/components/GasMeter.tsx**

```tsx
import { motion } from 'framer-motion'
import { useDebugStore } from '../store/debugStore'

export function GasMeter() {
  const snapshot = useDebugStore((s) => s.snapshot)
  const session = useDebugStore((s) => s.session)

  if (!snapshot || !session) {
    return null
  }

  // Get initial gas from first snapshot
  const initialSnapshot = session.getSnapshot(0)
  const initialGas = initialSnapshot.gasRemaining
  const currentGas = snapshot.gasRemaining
  const usedGas = initialGas - currentGas
  const percentRemaining = Number((currentGas * 100n) / initialGas)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">GAS</h2>

      {/* Visual Meter */}
      <div className="relative h-4 bg-evmix-bg rounded overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-evmix-success via-evmix-warning to-evmix-error"
          initial={{ width: '100%' }}
          animate={{ width: `${percentRemaining}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* Numbers */}
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-evmix-muted">
          Used: <span className="text-evmix-error">{usedGas.toString()}</span>
        </span>
        <span className="text-evmix-muted">
          Remaining:{' '}
          <span className="text-evmix-success">{currentGas.toString()}</span>
        </span>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add packages/evmix-ui/src/components/GasMeter.tsx
git commit -m "feat(ui): add GasMeter component with animated gauge"
```

---

## Task 10: Create Current Opcode Display

**Files:**
- Create: `packages/evmix-ui/src/components/OpcodeDisplay.tsx`

**Step 1: Create src/components/OpcodeDisplay.tsx**

```tsx
import { useDebugStore } from '../store/debugStore'
import type { OpcodeStartEvent } from 'evmix-core'

// Opcode descriptions for learning
const OPCODE_DESCRIPTIONS: Record<string, string> = {
  STOP: 'Halts execution',
  ADD: 'Addition: a + b',
  MUL: 'Multiplication: a * b',
  SUB: 'Subtraction: a - b',
  DIV: 'Integer division: a / b',
  PUSH1: 'Push 1-byte value onto stack',
  PUSH32: 'Push 32-byte value onto stack',
  POP: 'Remove top stack item',
  MLOAD: 'Load 32 bytes from memory',
  MSTORE: 'Store 32 bytes to memory',
  SLOAD: 'Load from storage',
  SSTORE: 'Store to storage',
  JUMP: 'Unconditional jump',
  JUMPI: 'Conditional jump',
  JUMPDEST: 'Valid jump destination marker',
  PC: 'Push program counter',
  GAS: 'Push remaining gas',
  CALLER: 'Push msg.sender',
  CALLVALUE: 'Push msg.value',
  ADDRESS: 'Push contract address',
  RETURN: 'Return data and halt',
  REVERT: 'Revert and return data',
}

export function OpcodeDisplay() {
  const events = useDebugStore((s) => s.events)
  const snapshot = useDebugStore((s) => s.snapshot)

  // Find the last opcode.start event
  const opcodeEvents = events.filter(
    (e) => e.type === 'opcode.start'
  ) as OpcodeStartEvent[]

  const currentOpcode = opcodeEvents[opcodeEvents.length - 1]

  if (!currentOpcode || !snapshot) {
    return (
      <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-evmix-muted mb-3">
          CURRENT OPCODE
        </h2>
        <p className="text-evmix-muted text-sm">No execution</p>
      </div>
    )
  }

  const description =
    OPCODE_DESCRIPTIONS[currentOpcode.opcodeName] ||
    OPCODE_DESCRIPTIONS[currentOpcode.opcodeName.replace(/\d+$/, '')] ||
    'EVM opcode'

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        CURRENT OPCODE
      </h2>

      <div className="flex items-center gap-3">
        {/* Opcode Badge */}
        <div className="bg-evmix-accent text-black px-3 py-1 rounded font-bold">
          {currentOpcode.opcodeName}
        </div>

        {/* Hex */}
        <code className="text-xs text-evmix-muted">
          0x{currentOpcode.opcode.toString(16).padStart(2, '0')}
        </code>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-evmix-muted">{description}</p>

      {/* Program Counter */}
      <div className="mt-3 flex gap-4 text-xs text-evmix-muted">
        <span>
          PC: <code className="text-evmix-text">{snapshot.pc}</code>
        </span>
        <span>
          Halted:{' '}
          <code
            className={snapshot.halted ? 'text-evmix-error' : 'text-evmix-success'}
          >
            {snapshot.halted ? 'Yes' : 'No'}
          </code>
        </span>
        {snapshot.haltReason && (
          <span>
            Reason:{' '}
            <code className="text-evmix-warning">{snapshot.haltReason}</code>
          </span>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add packages/evmix-ui/src/components/OpcodeDisplay.tsx
git commit -m "feat(ui): add OpcodeDisplay component with descriptions"
```

---

## Task 11: Wire Up App Layout

**Files:**
- Modify: `packages/evmix-ui/src/App.tsx`
- Create: `packages/evmix-ui/src/components/panels/index.ts`

**Step 1: Create panel exports**

```typescript
// packages/evmix-ui/src/components/panels/index.ts
export { StackPanel } from './StackPanel'
export { MemoryPanel } from './MemoryPanel'
export { StoragePanel } from './StoragePanel'
```

**Step 2: Update App.tsx**

```tsx
import { BytecodeInput } from './components/BytecodeInput'
import { Timeline } from './components/Timeline'
import { StackPanel, MemoryPanel, StoragePanel } from './components/panels'
import { GasMeter } from './components/GasMeter'
import { OpcodeDisplay } from './components/OpcodeDisplay'
import { useDebugStore } from './store/debugStore'

export default function App() {
  const session = useDebugStore((s) => s.session)

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-evmix-accent">EVMIX Lab</h1>
        <p className="text-evmix-muted text-sm">
          An observable, educational Ethereum Virtual Machine
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Sidebar - Input */}
        <div className="col-span-3 space-y-4">
          <BytecodeInput />
          {session && <GasMeter />}
          {session && <OpcodeDisplay />}
        </div>

        {/* Main Content - State Panels */}
        <div className="col-span-9 space-y-4">
          {session ? (
            <>
              {/* Timeline */}
              <Timeline />

              {/* State Panels */}
              <div className="grid grid-cols-3 gap-4">
                <StackPanel />
                <MemoryPanel />
                <StoragePanel />
              </div>
            </>
          ) : (
            <div className="bg-evmix-panel border border-evmix-border rounded-lg p-8 text-center">
              <p className="text-evmix-muted">
                Load bytecode to start debugging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Verify it runs**

```bash
cd packages/evmix-ui && npm run dev
```

Expected: App loads with input panel, clicking "Simple Add" example and "Load & Execute" shows the timeline and state panels.

**Step 4: Commit**

```bash
git add packages/evmix-ui/src
git commit -m "feat(ui): wire up main App layout with all components"
```

---

## Task 12: Fix Import Issues and Polish

**Purpose:** The DebugSession imports `MemoryHost` from a path that may not be exported. Fix exports and any remaining issues.

**Step 1: Update evmix-core exports to include Host**

```typescript
// Add to packages/evmix-core/src/index.ts
export { Host, LogEntry, TxContext, MsgContext, BlockContext, Account } from './host/Host'
export { MemoryHost, MemoryHostConfig } from './host/MemoryHost'
```

**Step 2: Update DebugSession import**

```typescript
// In packages/evmix-ui/src/lib/DebugSession.ts
// Change:
import { MemoryHost } from 'evmix-core/src/host/MemoryHost'
// To:
import { MemoryHost } from 'evmix-core'
```

**Step 3: Verify builds**

```bash
cd packages/evmix-core && npm run build
cd ../evmix-ui && npm run typecheck
```

**Step 4: Commit**

```bash
git add packages/evmix-core/src/index.ts packages/evmix-ui/src/lib/DebugSession.ts
git commit -m "fix: export Host types from evmix-core, fix DebugSession imports"
```

---

## Task 13: Final Integration Test

**Step 1: Run the full app**

```bash
cd packages/evmix-ui && npm run dev
```

**Step 2: Test sequence**
1. Click "Simple Add" example button
2. Click "Load & Execute"
3. Verify timeline appears with step count
4. Scrub timeline back and forth
5. Verify stack shows values changing
6. Click play, verify animation
7. Load "Storage Write" example
8. Verify storage panel shows the write

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ui): complete EVMIX Lab frontend with state dashboard and timeline"
```

---

## Summary

This plan creates the complete frontend foundation:

1. **evmix-ui package** - React + Vite + Tailwind scaffold
2. **DebugSession** - Execution wrapper with snapshot-based time-travel
3. **Zustand store** - Central state management
4. **State Dashboard** - Stack, Memory, Storage panels with animations
5. **Timeline** - Scrubber with playback controls and event markers
6. **Supporting components** - BytecodeInput, GasMeter, OpcodeDisplay

**Architected for Mainnet Replay:**
- `TraceSource` interface abstracts where trace data comes from
- `DebugSessionConfig.hostConfig` accepts address, caller, block context
- Components only depend on snapshots and events, not execution method

**Not included (future work):**
- Mainnet replay data fetching
- Source map integration
- Bytecode disassembly view
- Advanced animations (per-byte memory highlights)
