# Phase 5: Debug Power - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move DebugSession to evmix-core and add interactive stepping, time travel, breakpoints, and state mutation.

**Architecture:** DebugSession wraps Interpreter, emits events for UI reactivity, uses lazy snapshots with checkpoints for efficient time travel.

**Tech Stack:** TypeScript, Vitest for testing

---

## 1. Architecture Overview

```
evmix-core/
  src/
    debug/
      DebugSession.ts    ← Main class
      Snapshot.ts        ← State snapshot types
      Breakpoint.ts      ← Breakpoint predicate types
      SnapshotManager.ts ← Checkpoint/reconstruction logic
      index.ts           ← Public exports
```

The DebugSession emits events that the UI can subscribe to:

```typescript
interface DebugEventPayload {
  type: 'step' | 'breakpoint-hit' | 'halted' | 'state-mutated' | 'reset' | 'time-travel'
  stepIndex: number
  snapshot: Snapshot
  metadata?: {
    breakpointId?: string
    haltReason?: HaltReason
    forkPoint?: number
  }
}
```

This enables the Web Lab (Phase 6) to react in real-time to execution changes.

---

## 2. DebugSession API

```typescript
interface DebugSessionConfig {
  bytecode: Uint8Array
  initialGas: bigint
  calldata?: Uint8Array
  host?: MemoryHost
}

class DebugSession {
  // === Execution Control ===
  step(): StepResult
  stepBack(): boolean
  run(): void
  runUntil(predicate: (ctx: BreakpointContext) => boolean): void
  reset(): void

  // === State Access ===
  getSnapshot(): Snapshot
  getSnapshotAt(step: number): Snapshot
  getCurrentStep(): number
  getTotalSteps(): number
  isHalted(): boolean

  // === Breakpoints ===
  addBreakpoint(bp: BreakpointCondition): string
  removeBreakpoint(id: string): void
  clearBreakpoints(): void

  // === State Mutation ===
  mutate(fn: (host: MemoryHost) => void): void

  // === Trace & Export ===
  getTrace(): TraceEvent[]
  exportSession(): SessionExport

  // === Events ===
  on(event: DebugEventType, handler: (payload: DebugEventPayload) => void): void
  off(event: DebugEventType, handler: Function): void
}

interface StepResult {
  executed: boolean
  opcode?: number
  opcodeName?: string
  gasUsed?: bigint
  halted: boolean
  haltReason?: HaltReason
  breakpointHit?: string
}
```

---

## 3. Snapshots & Time Travel

```typescript
interface Snapshot {
  stepIndex: number
  pc: number
  gasRemaining: bigint
  stack: Word256[]
  memory: Uint8Array
  returnData: Uint8Array
  halted: boolean
  haltReason?: HaltReason

  // For Phase 6 visualizations
  delta?: {
    stackPushed: Word256[]
    stackPopped: Word256[]
    memoryWrites: { offset: number, data: Uint8Array }[]
    storageWrites: { key: Word256, oldValue: Word256, newValue: Word256 }[]
    logsEmitted: LogEntry[]
    gasUsed: bigint
  }
}
```

**Snapshot strategy:**

1. **Lazy snapshots** - Only capture when needed
2. **Checkpoint interval** - Auto-snapshot every 50 steps
3. **On-demand reconstruction** - Find nearest checkpoint, replay to target

```typescript
class SnapshotManager {
  private checkpoints: Map<number, Snapshot>
  private checkpointInterval = 50

  capture(step: number, interpreter: Interpreter): Snapshot
  getNearest(step: number): { snapshot: Snapshot, stepsToReplay: number }
  invalidateAfter(step: number): void
}
```

---

## 4. Breakpoints

```typescript
type BreakpointCondition =
  | { type: 'pc', value: number }
  | { type: 'opcode', opcode: number }
  | { type: 'opcodeName', name: string }
  | { type: 'gasBelow', threshold: bigint }
  | { type: 'storageWrite', key?: Word256 }
  | { type: 'storageRead', key?: Word256 }
  | { type: 'custom', fn: (ctx: BreakpointContext) => boolean }

interface Breakpoint {
  id: string
  enabled: boolean
  condition: BreakpointCondition
}

interface BreakpointContext {
  pc: number
  opcode: number
  opcodeName: string
  gasRemaining: bigint
  stack: readonly Word256[]
  stepIndex: number
  lastEvent?: TraceEvent
}
```

Breakpoints are evaluated after each `step()`, before returning.

---

## 5. State Mutation

```typescript
mutate(fn: (host: MemoryHost) => void): void {
  const forkPoint = this.currentStep
  fn(this.host)
  this.snapshotManager.invalidateAfter(forkPoint)
  this.forkPoint = forkPoint
  this.emit('state-mutated', { step: forkPoint })
}
```

After mutation:
- All snapshots after the fork point are invalidated
- User can only go forward (going back past fork restores original state)
- UI shows fork indicator on timeline

---

## 6. Events

```typescript
type DebugEventType =
  | 'step'
  | 'breakpoint-hit'
  | 'halted'
  | 'state-mutated'
  | 'reset'
  | 'time-travel'
```

Simple EventEmitter pattern for UI reactivity.

---

## 7. Migration from UI Package

The existing `evmix-ui/src/lib/DebugSession.ts` will be:
1. Moved to `evmix-core/src/debug/`
2. Refactored to match new API
3. UI package will import from `@evmix/core`

The UI's `debugStore.ts` will be updated to use the new event system instead of polling.

---

## 8. Testing Strategy

```typescript
describe('DebugSession', () => {
  describe('stepping', () => {
    it('step() executes one opcode and returns result')
    it('step() returns executed:false when halted')
    it('stepBack() returns to previous snapshot')
    it('stepBack() returns false at step 0')
  })

  describe('time travel', () => {
    it('getSnapshotAt() reconstructs from checkpoint')
    it('checkpoints are created at intervals')
    it('can jump to any step and continue')
  })

  describe('breakpoints', () => {
    it('stops on PC breakpoint')
    it('stops on opcode breakpoint')
    it('stops on storage write breakpoint')
    it('custom predicate breakpoint works')
    it('disabled breakpoints are skipped')
  })

  describe('mutation', () => {
    it('mutate() changes host state')
    it('invalidates snapshots after fork point')
    it('emits state-mutated event')
  })

  describe('events', () => {
    it('emits step event after each opcode')
    it('emits halted event when execution ends')
    it('emits breakpoint-hit with breakpoint ID')
  })
})
```

---

## 9. Phase 6 Preparation

The `delta` field in Snapshot enables rich visualizations:
- Stack animation (values flying on/off)
- Memory heatmap (highlight recent writes)
- Storage diff panel
- Gas burn per opcode

The event system enables reactive UI updates without polling.

---

## Implementation Priority

1. **D. Move to core** - Create debug/ directory, move types
2. **B. Interactive stepping** - Implement step(), stepBack(), SnapshotManager
3. **C. State mutation** - Implement mutate() with fork tracking
4. **A. Breakpoints** - Implement breakpoint system

---

Last Updated: January 16, 2026
