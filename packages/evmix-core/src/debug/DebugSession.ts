// packages/evmix-core/src/debug/DebugSession.ts
import { Interpreter } from '../interpreter/Interpreter'
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
