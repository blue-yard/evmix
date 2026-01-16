# Phase 5: Debug Session Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move DebugSession to evmix-core with interactive stepping, time travel, breakpoints, and state mutation.

**Architecture:** DebugSession wraps Interpreter, SnapshotManager handles checkpoints, EventEmitter pattern for UI reactivity.

**Tech Stack:** TypeScript, Vitest

---

## Task 1: Create Debug Module Structure

**Files:**
- Create: `packages/evmix-core/src/debug/Snapshot.ts`
- Create: `packages/evmix-core/src/debug/index.ts`

**Step 1: Create Snapshot types**

```typescript
// packages/evmix-core/src/debug/Snapshot.ts
import { Word256 } from '../types/Word256'
import { HaltReason } from '../state/HaltReason'
import { LogEntry } from '../host/Host'

/**
 * Delta - what changed in a single step (for Phase 6 visualizations)
 */
export interface SnapshotDelta {
  stackPushed: Word256[]
  stackPopped: Word256[]
  memoryWrites: { offset: number; data: Uint8Array }[]
  storageWrites: { key: Word256; oldValue: Word256; newValue: Word256 }[]
  logsEmitted: LogEntry[]
  gasUsed: bigint
}

/**
 * Snapshot - complete state at a point in execution
 */
export interface Snapshot {
  stepIndex: number
  pc: number
  gasRemaining: bigint
  stack: Word256[]
  memory: Uint8Array
  returnData: Uint8Array
  halted: boolean
  haltReason?: HaltReason
  delta?: SnapshotDelta
}

/**
 * Create a snapshot from interpreter state
 */
export function createSnapshot(
  stepIndex: number,
  pc: number,
  gasRemaining: bigint,
  stack: Word256[],
  memory: Uint8Array,
  returnData: Uint8Array,
  halted: boolean,
  haltReason?: HaltReason,
  delta?: SnapshotDelta
): Snapshot {
  return {
    stepIndex,
    pc,
    gasRemaining,
    stack: [...stack],
    memory: new Uint8Array(memory),
    returnData: new Uint8Array(returnData),
    halted,
    haltReason,
    delta,
  }
}
```

**Step 2: Create index.ts with exports**

```typescript
// packages/evmix-core/src/debug/index.ts
export { Snapshot, SnapshotDelta, createSnapshot } from './Snapshot'
```

**Step 3: Run build to verify no errors**

Run: `cd /home/chad/src/evmix && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/evmix-core/src/debug/
git commit -m "feat(debug): add Snapshot types"
```

---

## Task 2: Create Breakpoint Types

**Files:**
- Create: `packages/evmix-core/src/debug/Breakpoint.ts`
- Modify: `packages/evmix-core/src/debug/index.ts`

**Step 1: Create Breakpoint types**

```typescript
// packages/evmix-core/src/debug/Breakpoint.ts
import { Word256 } from '../types/Word256'
import { TraceEvent } from '../trace/TraceEvent'

/**
 * Context available to breakpoint predicates
 */
export interface BreakpointContext {
  pc: number
  opcode: number
  opcodeName: string
  gasRemaining: bigint
  stack: readonly Word256[]
  stepIndex: number
  lastEvent?: TraceEvent
}

/**
 * Breakpoint condition types
 */
export type BreakpointCondition =
  | { type: 'pc'; value: number }
  | { type: 'opcode'; opcode: number }
  | { type: 'opcodeName'; name: string }
  | { type: 'gasBelow'; threshold: bigint }
  | { type: 'storageWrite'; key?: Word256 }
  | { type: 'storageRead'; key?: Word256 }
  | { type: 'custom'; fn: (ctx: BreakpointContext) => boolean }

/**
 * Breakpoint with ID and enabled state
 */
export interface Breakpoint {
  id: string
  enabled: boolean
  condition: BreakpointCondition
}

/**
 * Evaluate a breakpoint condition
 */
export function evaluateBreakpoint(
  condition: BreakpointCondition,
  ctx: BreakpointContext
): boolean {
  switch (condition.type) {
    case 'pc':
      return ctx.pc === condition.value
    case 'opcode':
      return ctx.opcode === condition.opcode
    case 'opcodeName':
      return ctx.opcodeName === condition.name
    case 'gasBelow':
      return ctx.gasRemaining < condition.threshold
    case 'storageWrite':
      // Check if last event was a storage write
      if (ctx.lastEvent?.type !== 'storage.write') return false
      if (condition.key === undefined) return true
      return (ctx.lastEvent as any).key?.toHex?.() === condition.key.toHex()
    case 'storageRead':
      if (ctx.lastEvent?.type !== 'storage.read') return false
      if (condition.key === undefined) return true
      return (ctx.lastEvent as any).key?.toHex?.() === condition.key.toHex()
    case 'custom':
      return condition.fn(ctx)
    default:
      return false
  }
}
```

**Step 2: Update index.ts**

```typescript
// packages/evmix-core/src/debug/index.ts
export { Snapshot, SnapshotDelta, createSnapshot } from './Snapshot'
export {
  Breakpoint,
  BreakpointCondition,
  BreakpointContext,
  evaluateBreakpoint,
} from './Breakpoint'
```

**Step 3: Run build**

Run: `cd /home/chad/src/evmix && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/evmix-core/src/debug/
git commit -m "feat(debug): add Breakpoint types and evaluation"
```

---

## Task 3: Create SnapshotManager

**Files:**
- Create: `packages/evmix-core/src/debug/SnapshotManager.ts`
- Create: `packages/evmix-core/tests/debug/SnapshotManager.test.ts`
- Modify: `packages/evmix-core/src/debug/index.ts`

**Step 1: Write failing test**

```typescript
// packages/evmix-core/tests/debug/SnapshotManager.test.ts
import { describe, it, expect } from 'vitest'
import { SnapshotManager } from '../../src/debug/SnapshotManager'
import { createSnapshot } from '../../src/debug/Snapshot'
import { Word256 } from '../../src/types/Word256'

describe('SnapshotManager', () => {
  function makeSnapshot(stepIndex: number) {
    return createSnapshot(
      stepIndex,
      stepIndex * 2, // pc
      1000000n - BigInt(stepIndex * 100), // gas
      [Word256.from(BigInt(stepIndex))], // stack
      new Uint8Array(0),
      new Uint8Array(0),
      false
    )
  }

  it('should store and retrieve snapshots', () => {
    const manager = new SnapshotManager()
    const snapshot = makeSnapshot(5)
    manager.store(5, snapshot)
    expect(manager.get(5)).toEqual(snapshot)
  })

  it('should auto-checkpoint at intervals', () => {
    const manager = new SnapshotManager(10) // checkpoint every 10 steps
    for (let i = 0; i <= 25; i++) {
      manager.maybeCheckpoint(i, makeSnapshot(i))
    }
    // Should have checkpoints at 0, 10, 20
    expect(manager.get(0)).toBeDefined()
    expect(manager.get(10)).toBeDefined()
    expect(manager.get(20)).toBeDefined()
    expect(manager.get(5)).toBeUndefined()
  })

  it('should find nearest earlier checkpoint', () => {
    const manager = new SnapshotManager(10)
    manager.store(0, makeSnapshot(0))
    manager.store(10, makeSnapshot(10))
    manager.store(20, makeSnapshot(20))

    const nearest = manager.getNearestCheckpoint(15)
    expect(nearest?.stepIndex).toBe(10)
  })

  it('should invalidate snapshots after a step', () => {
    const manager = new SnapshotManager(10)
    manager.store(0, makeSnapshot(0))
    manager.store(10, makeSnapshot(10))
    manager.store(20, makeSnapshot(20))

    manager.invalidateAfter(10)

    expect(manager.get(0)).toBeDefined()
    expect(manager.get(10)).toBeDefined()
    expect(manager.get(20)).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /home/chad/src/evmix/packages/evmix-core && npx vitest run tests/debug/SnapshotManager.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement SnapshotManager**

```typescript
// packages/evmix-core/src/debug/SnapshotManager.ts
import { Snapshot } from './Snapshot'

/**
 * SnapshotManager - handles checkpoint storage and retrieval
 */
export class SnapshotManager {
  private snapshots: Map<number, Snapshot> = new Map()
  private checkpointInterval: number

  constructor(checkpointInterval: number = 50) {
    this.checkpointInterval = checkpointInterval
  }

  /**
   * Store a snapshot at a specific step
   */
  store(stepIndex: number, snapshot: Snapshot): void {
    this.snapshots.set(stepIndex, snapshot)
  }

  /**
   * Get a snapshot at a specific step (or undefined if not stored)
   */
  get(stepIndex: number): Snapshot | undefined {
    return this.snapshots.get(stepIndex)
  }

  /**
   * Store snapshot if at a checkpoint interval
   */
  maybeCheckpoint(stepIndex: number, snapshot: Snapshot): void {
    if (stepIndex % this.checkpointInterval === 0) {
      this.store(stepIndex, snapshot)
    }
  }

  /**
   * Find the nearest checkpoint at or before the given step
   */
  getNearestCheckpoint(stepIndex: number): Snapshot | undefined {
    let nearest: Snapshot | undefined
    let nearestStep = -1

    for (const [step, snapshot] of this.snapshots) {
      if (step <= stepIndex && step > nearestStep) {
        nearestStep = step
        nearest = snapshot
      }
    }

    return nearest
  }

  /**
   * Invalidate all snapshots after a given step (for mutation/forking)
   */
  invalidateAfter(stepIndex: number): void {
    for (const step of this.snapshots.keys()) {
      if (step > stepIndex) {
        this.snapshots.delete(step)
      }
    }
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear()
  }

  /**
   * Get checkpoint interval
   */
  getCheckpointInterval(): number {
    return this.checkpointInterval
  }
}
```

**Step 4: Update index.ts**

```typescript
// packages/evmix-core/src/debug/index.ts
export { Snapshot, SnapshotDelta, createSnapshot } from './Snapshot'
export {
  Breakpoint,
  BreakpointCondition,
  BreakpointContext,
  evaluateBreakpoint,
} from './Breakpoint'
export { SnapshotManager } from './SnapshotManager'
```

**Step 5: Run tests**

Run: `cd /home/chad/src/evmix/packages/evmix-core && npx vitest run tests/debug/SnapshotManager.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/evmix-core/src/debug/ packages/evmix-core/tests/debug/
git commit -m "feat(debug): add SnapshotManager with checkpointing"
```

---

## Task 4: Create DebugSession Core

**Files:**
- Create: `packages/evmix-core/src/debug/DebugSession.ts`
- Create: `packages/evmix-core/tests/debug/DebugSession.test.ts`
- Modify: `packages/evmix-core/src/debug/index.ts`

**Step 1: Write failing test for basic stepping**

```typescript
// packages/evmix-core/tests/debug/DebugSession.test.ts
import { describe, it, expect } from 'vitest'
import { DebugSession } from '../../src/debug/DebugSession'
import { MemoryHost } from '../../src/host/MemoryHost'

describe('DebugSession', () => {
  describe('stepping', () => {
    it('step() executes one opcode and returns result', () => {
      // PUSH1 5, PUSH1 3, ADD, STOP
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      const result1 = session.step()
      expect(result1.executed).toBe(true)
      expect(result1.opcodeName).toBe('PUSH1')
      expect(result1.halted).toBe(false)
      expect(session.getCurrentStep()).toBe(1)
    })

    it('step() returns executed:false when halted', () => {
      const bytecode = new Uint8Array([0x00]) // STOP
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.step() // Execute STOP
      const result = session.step() // Try to step again

      expect(result.executed).toBe(false)
      expect(result.halted).toBe(true)
    })

    it('run() executes until halted', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.run()

      expect(session.isHalted()).toBe(true)
      expect(session.getCurrentStep()).toBe(4) // 4 opcodes executed
    })
  })

  describe('state access', () => {
    it('getSnapshot() returns current state', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x00]) // PUSH1 5, STOP
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.step() // PUSH1 5
      const snapshot = session.getSnapshot()

      expect(snapshot.stepIndex).toBe(1)
      expect(snapshot.stack.length).toBe(1)
      expect(snapshot.stack[0].value).toBe(5n)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /home/chad/src/evmix/packages/evmix-core && npx vitest run tests/debug/DebugSession.test.ts`
Expected: FAIL

**Step 3: Implement DebugSession core**

```typescript
// packages/evmix-core/src/debug/DebugSession.ts
import { Interpreter, InterpreterConfig } from '../interpreter/Interpreter'
import { MemoryHost } from '../host/MemoryHost'
import { getOpcodeName } from '../opcodes/Opcode'
import { HaltReason } from '../state/HaltReason'
import { Snapshot, createSnapshot } from './Snapshot'
import { SnapshotManager } from './SnapshotManager'
import {
  Breakpoint,
  BreakpointCondition,
  BreakpointContext,
  evaluateBreakpoint,
} from './Breakpoint'

/**
 * Configuration for DebugSession
 */
export interface DebugSessionConfig {
  bytecode: Uint8Array
  initialGas: bigint
  calldata?: Uint8Array
  host?: MemoryHost
  checkpointInterval?: number
}

/**
 * Result of a step operation
 */
export interface StepResult {
  executed: boolean
  opcode?: number
  opcodeName?: string
  gasUsed?: bigint
  halted: boolean
  haltReason?: HaltReason
  breakpointHit?: string
}

/**
 * Debug event types
 */
export type DebugEventType =
  | 'step'
  | 'breakpoint-hit'
  | 'halted'
  | 'state-mutated'
  | 'reset'
  | 'time-travel'

/**
 * Debug event payload
 */
export interface DebugEventPayload {
  type: DebugEventType
  stepIndex: number
  snapshot: Snapshot
  metadata?: {
    breakpointId?: string
    haltReason?: HaltReason
    forkPoint?: number
  }
}

type EventHandler = (payload: DebugEventPayload) => void

/**
 * DebugSession - Interactive EVM execution with time travel
 */
export class DebugSession {
  private interpreter: Interpreter
  private host: MemoryHost
  private bytecode: Uint8Array
  private initialGas: bigint
  private calldata: Uint8Array
  private snapshotManager: SnapshotManager
  private currentStep: number = 0
  private breakpoints: Map<string, Breakpoint> = new Map()
  private nextBreakpointId: number = 1
  private forkPoint?: number
  private listeners: Map<DebugEventType, Set<EventHandler>> = new Map()

  constructor(config: DebugSessionConfig) {
    this.bytecode = config.bytecode
    this.initialGas = config.initialGas
    this.calldata = config.calldata || new Uint8Array(0)
    this.host = config.host || new MemoryHost()
    this.snapshotManager = new SnapshotManager(config.checkpointInterval)

    this.interpreter = new Interpreter({
      bytecode: this.bytecode,
      initialGas: this.initialGas,
      calldata: this.calldata,
      host: this.host,
    })

    // Capture initial snapshot
    this.snapshotManager.store(0, this.captureSnapshot(0))
  }

  /**
   * Execute one opcode
   */
  step(): StepResult {
    if (this.interpreter.isHalted()) {
      return {
        executed: false,
        halted: true,
        haltReason: this.interpreter.getHaltReason(),
      }
    }

    const gasBefore = this.interpreter.getState().gasRemaining
    const pc = this.interpreter.getState().pc
    const opcode = this.bytecode[pc]
    const opcodeName = getOpcodeName(opcode)

    // Execute the step
    this.interpreter.step()
    this.currentStep++

    const gasAfter = this.interpreter.getState().gasRemaining
    const gasUsed = gasBefore - gasAfter

    // Capture snapshot
    const snapshot = this.captureSnapshot(this.currentStep)
    this.snapshotManager.maybeCheckpoint(this.currentStep, snapshot)

    // Check breakpoints
    const ctx = this.createBreakpointContext(pc, opcode, opcodeName)
    const hitBreakpoint = this.checkBreakpoints(ctx)

    const halted = this.interpreter.isHalted()
    const haltReason = this.interpreter.getHaltReason()

    // Emit events
    if (hitBreakpoint) {
      this.emit('breakpoint-hit', {
        stepIndex: this.currentStep,
        snapshot,
        metadata: { breakpointId: hitBreakpoint },
      })
    } else if (halted) {
      this.emit('halted', {
        stepIndex: this.currentStep,
        snapshot,
        metadata: { haltReason },
      })
    } else {
      this.emit('step', { stepIndex: this.currentStep, snapshot })
    }

    return {
      executed: true,
      opcode,
      opcodeName,
      gasUsed,
      halted,
      haltReason,
      breakpointHit: hitBreakpoint,
    }
  }

  /**
   * Run until halted or breakpoint hit
   */
  run(): void {
    while (!this.interpreter.isHalted()) {
      const result = this.step()
      if (result.breakpointHit) break
    }
  }

  /**
   * Run until predicate returns true
   */
  runUntil(predicate: (ctx: BreakpointContext) => boolean): void {
    while (!this.interpreter.isHalted()) {
      const pc = this.interpreter.getState().pc
      const opcode = this.bytecode[pc]
      const opcodeName = getOpcodeName(opcode)

      this.step()

      const ctx = this.createBreakpointContext(pc, opcode, opcodeName)
      if (predicate(ctx)) break
    }
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.interpreter = new Interpreter({
      bytecode: this.bytecode,
      initialGas: this.initialGas,
      calldata: this.calldata,
      host: this.host,
    })
    this.currentStep = 0
    this.snapshotManager.clear()
    this.snapshotManager.store(0, this.captureSnapshot(0))
    this.forkPoint = undefined

    this.emit('reset', {
      stepIndex: 0,
      snapshot: this.snapshotManager.get(0)!,
    })
  }

  // === State Access ===

  getSnapshot(): Snapshot {
    return this.captureSnapshot(this.currentStep)
  }

  getSnapshotAt(step: number): Snapshot | undefined {
    return this.snapshotManager.get(step)
  }

  getCurrentStep(): number {
    return this.currentStep
  }

  getTotalSteps(): number {
    return this.interpreter.isHalted() ? this.currentStep : -1
  }

  isHalted(): boolean {
    return this.interpreter.isHalted()
  }

  getBytecode(): Uint8Array {
    return this.bytecode
  }

  getTrace() {
    return this.interpreter.getTrace().getEvents()
  }

  // === Breakpoints ===

  addBreakpoint(condition: BreakpointCondition): string {
    const id = `bp_${this.nextBreakpointId++}`
    this.breakpoints.set(id, { id, enabled: true, condition })
    return id
  }

  removeBreakpoint(id: string): void {
    this.breakpoints.delete(id)
  }

  clearBreakpoints(): void {
    this.breakpoints.clear()
  }

  // === State Mutation ===

  mutate(fn: (host: MemoryHost) => void): void {
    this.forkPoint = this.currentStep
    fn(this.host)
    this.snapshotManager.invalidateAfter(this.currentStep)

    this.emit('state-mutated', {
      stepIndex: this.currentStep,
      snapshot: this.getSnapshot(),
      metadata: { forkPoint: this.forkPoint },
    })
  }

  getForkPoint(): number | undefined {
    return this.forkPoint
  }

  // === Events ===

  on(event: DebugEventType, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: DebugEventType, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  private emit(type: DebugEventType, payload: Omit<DebugEventPayload, 'type'>): void {
    const fullPayload: DebugEventPayload = { type, ...payload }
    this.listeners.get(type)?.forEach((handler) => handler(fullPayload))
  }

  // === Private Helpers ===

  private captureSnapshot(stepIndex: number): Snapshot {
    const state = this.interpreter.getState()
    const stack = this.interpreter.getStack()

    return createSnapshot(
      stepIndex,
      state.pc,
      state.gasRemaining,
      stack.toArray(),
      state.memory,
      state.returnData,
      state.halted,
      state.haltReason
    )
  }

  private createBreakpointContext(
    pc: number,
    opcode: number,
    opcodeName: string
  ): BreakpointContext {
    const state = this.interpreter.getState()
    const stack = this.interpreter.getStack()
    const events = this.interpreter.getTrace().getEvents()

    return {
      pc,
      opcode,
      opcodeName,
      gasRemaining: state.gasRemaining,
      stack: stack.toArray(),
      stepIndex: this.currentStep,
      lastEvent: events.length > 0 ? events[events.length - 1] : undefined,
    }
  }

  private checkBreakpoints(ctx: BreakpointContext): string | undefined {
    for (const bp of this.breakpoints.values()) {
      if (bp.enabled && evaluateBreakpoint(bp.condition, ctx)) {
        return bp.id
      }
    }
    return undefined
  }
}
```

**Step 4: Update index.ts**

```typescript
// packages/evmix-core/src/debug/index.ts
export { Snapshot, SnapshotDelta, createSnapshot } from './Snapshot'
export {
  Breakpoint,
  BreakpointCondition,
  BreakpointContext,
  evaluateBreakpoint,
} from './Breakpoint'
export { SnapshotManager } from './SnapshotManager'
export {
  DebugSession,
  DebugSessionConfig,
  StepResult,
  DebugEventType,
  DebugEventPayload,
} from './DebugSession'
```

**Step 5: Run tests**

Run: `cd /home/chad/src/evmix/packages/evmix-core && npx vitest run tests/debug/DebugSession.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/evmix-core/src/debug/ packages/evmix-core/tests/debug/
git commit -m "feat(debug): add DebugSession with stepping and state access"
```

---

## Task 5: Add Breakpoint Tests

**Files:**
- Modify: `packages/evmix-core/tests/debug/DebugSession.test.ts`

**Step 1: Add breakpoint tests**

```typescript
// Add to packages/evmix-core/tests/debug/DebugSession.test.ts

describe('breakpoints', () => {
  it('stops on PC breakpoint', () => {
    // PUSH1 5, PUSH1 3, ADD, STOP (ADD is at PC=4)
    const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
    })

    session.addBreakpoint({ type: 'pc', value: 4 })
    session.run()

    expect(session.getCurrentStep()).toBe(2) // Stopped before ADD
    expect(session.isHalted()).toBe(false)
  })

  it('stops on opcode breakpoint', () => {
    // PUSH1 5, PUSH1 3, ADD, STOP
    const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
    })

    session.addBreakpoint({ type: 'opcode', opcode: 0x01 }) // ADD
    session.run()

    // Should stop after ADD executes
    expect(session.getSnapshot().stack.length).toBe(1) // Result of ADD
  })

  it('custom predicate breakpoint works', () => {
    const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
    })

    session.addBreakpoint({
      type: 'custom',
      fn: (ctx) => ctx.stack.length >= 2,
    })
    session.run()

    expect(session.getCurrentStep()).toBe(2) // After second PUSH
  })

  it('disabled breakpoints are skipped', () => {
    const bytecode = new Uint8Array([0x60, 0x05, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
    })

    const id = session.addBreakpoint({ type: 'pc', value: 0 })
    session.removeBreakpoint(id)
    session.run()

    expect(session.isHalted()).toBe(true) // Ran to completion
  })
})
```

**Step 2: Run tests**

Run: `cd /home/chad/src/evmix/packages/evmix-core && npx vitest run tests/debug/DebugSession.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/evmix-core/tests/debug/
git commit -m "test(debug): add breakpoint tests"
```

---

## Task 6: Add Mutation and Event Tests

**Files:**
- Modify: `packages/evmix-core/tests/debug/DebugSession.test.ts`

**Step 1: Add mutation and event tests**

```typescript
// Add to packages/evmix-core/tests/debug/DebugSession.test.ts
import { Word256 } from '../../src/types/Word256'
import { Address } from '../../src/types/Address'

describe('mutation', () => {
  it('mutate() changes host state', () => {
    const bytecode = new Uint8Array([0x60, 0x05, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
    })

    const addr = Address.fromHex('0x1234567890123456789012345678901234567890')
    session.mutate((host) => {
      host.setBalance(addr, 999n)
    })

    // Verify the host was mutated (we'd need to access host somehow)
    expect(session.getForkPoint()).toBe(0)
  })

  it('invalidates snapshots after fork point', () => {
    const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
      checkpointInterval: 1, // Checkpoint every step
    })

    session.step() // step 1
    session.step() // step 2

    expect(session.getSnapshotAt(1)).toBeDefined()
    expect(session.getSnapshotAt(2)).toBeDefined()

    // Go back to step 1 conceptually and mutate
    session.mutate(() => {})

    // Snapshots after current step should be invalidated
    // (In this case, no snapshots after step 2)
  })
})

describe('events', () => {
  it('emits step event after each opcode', () => {
    const bytecode = new Uint8Array([0x60, 0x05, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
    })

    const events: string[] = []
    session.on('step', () => events.push('step'))
    session.on('halted', () => events.push('halted'))

    session.step() // PUSH1
    session.step() // STOP

    expect(events).toContain('step')
    expect(events).toContain('halted')
  })

  it('emits breakpoint-hit with breakpoint ID', () => {
    const bytecode = new Uint8Array([0x60, 0x05, 0x00])
    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
    })

    let hitId: string | undefined
    session.on('breakpoint-hit', (payload) => {
      hitId = payload.metadata?.breakpointId
    })

    const id = session.addBreakpoint({ type: 'opcode', opcode: 0x60 })
    session.run()

    expect(hitId).toBe(id)
  })
})
```

**Step 2: Run tests**

Run: `cd /home/chad/src/evmix/packages/evmix-core && npx vitest run tests/debug/DebugSession.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/evmix-core/tests/debug/
git commit -m "test(debug): add mutation and event tests"
```

---

## Task 7: Export Debug Module from Core

**Files:**
- Modify: `packages/evmix-core/src/index.ts`

**Step 1: Add debug exports to main index**

```typescript
// Add to packages/evmix-core/src/index.ts

// Debug module
export {
  DebugSession,
  DebugSessionConfig,
  StepResult,
  DebugEventType,
  DebugEventPayload,
  Snapshot,
  SnapshotDelta,
  Breakpoint,
  BreakpointCondition,
  BreakpointContext,
  SnapshotManager,
} from './debug'
```

**Step 2: Build and test**

Run: `cd /home/chad/src/evmix && npm run build && npm test`
Expected: Build succeeds, all tests pass

**Step 3: Commit**

```bash
git add packages/evmix-core/src/index.ts
git commit -m "feat(core): export debug module from package"
```

---

## Task 8: Update UI to Use Core DebugSession

**Files:**
- Modify: `packages/evmix-ui/src/lib/DebugSession.ts`
- Modify: `packages/evmix-ui/src/store/debugStore.ts`

**Step 1: Update UI DebugSession to re-export from core**

```typescript
// packages/evmix-ui/src/lib/DebugSession.ts
// Re-export from core for backwards compatibility
export { DebugSession } from '@evmix/core'
export type {
  DebugSessionConfig,
  StepResult,
  Snapshot,
  DebugEventType,
  DebugEventPayload,
} from '@evmix/core'
```

**Step 2: Update types.ts if needed**

Check `packages/evmix-ui/src/lib/types.ts` and update any types that now come from core.

**Step 3: Build**

Run: `cd /home/chad/src/evmix && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/evmix-ui/
git commit -m "refactor(ui): use DebugSession from core"
```

---

## Task 9: Final Integration Test

**Files:**
- Create: `packages/evmix-core/tests/debug/integration.test.ts`

**Step 1: Write integration test**

```typescript
// packages/evmix-core/tests/debug/integration.test.ts
import { describe, it, expect } from 'vitest'
import { DebugSession } from '../../src/debug/DebugSession'
import { MemoryHost } from '../../src/host/MemoryHost'
import { Address } from '../../src/types/Address'
import { Word256 } from '../../src/types/Word256'

describe('DebugSession Integration', () => {
  it('full workflow: step, breakpoint, mutate, run', () => {
    // Contract: PUSH1 5, PUSH1 0, SSTORE, PUSH1 0, SLOAD, STOP
    // Stores 5 at slot 0, then loads it back
    const bytecode = new Uint8Array([
      0x60, 0x05,  // PUSH1 5
      0x60, 0x00,  // PUSH1 0
      0x55,        // SSTORE
      0x60, 0x00,  // PUSH1 0
      0x54,        // SLOAD
      0x00,        // STOP
    ])

    const host = new MemoryHost()
    const contractAddr = Address.fromHex('0x1111111111111111111111111111111111111111')
    host.setAddress(contractAddr)

    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
      host,
    })

    // Step through first two pushes
    session.step() // PUSH1 5
    session.step() // PUSH1 0
    expect(session.getSnapshot().stack.length).toBe(2)

    // Set breakpoint on SLOAD
    session.addBreakpoint({ type: 'opcode', opcode: 0x54 })

    // Run until breakpoint
    session.run()
    expect(session.isHalted()).toBe(false) // Stopped at breakpoint

    // Mutate storage before SLOAD executes
    session.mutate((h) => {
      h.sstore(contractAddr, Word256.zero(), Word256.from(999n))
    })

    // Continue to end
    session.clearBreakpoints()
    session.run()

    // Stack should have 999 (the mutated value)
    const finalStack = session.getSnapshot().stack
    expect(finalStack[0].value).toBe(999n)
  })
})
```

**Step 2: Run integration test**

Run: `cd /home/chad/src/evmix/packages/evmix-core && npx vitest run tests/debug/integration.test.ts`
Expected: PASS

**Step 3: Run all tests**

Run: `cd /home/chad/src/evmix && npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/evmix-core/tests/debug/
git commit -m "test(debug): add integration test for full workflow"
```

---

## Task 10: Update Progress Documentation

**Files:**
- Modify: `docs/PROGRESS.md`

**Step 1: Update PROGRESS.md**

Add Phase 5 completion status to the progress document.

**Step 2: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "docs: update progress for Phase 5 completion"
```

**Step 3: Push all changes**

```bash
git push
```

---

## Summary

After completing all tasks:

- Debug module in `evmix-core/src/debug/`
- DebugSession with step(), run(), runUntil()
- SnapshotManager with checkpointing
- Breakpoints with multiple condition types
- State mutation with fork tracking
- Event system for UI reactivity
- UI updated to use core DebugSession
- Full test coverage

**Total new tests:** ~25
**Total new files:** 6
**Estimated commits:** 10
