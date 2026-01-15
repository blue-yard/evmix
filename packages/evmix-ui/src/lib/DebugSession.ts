import {
  Interpreter,
  TraceEvent,
  TraceCollector,
  Address,
  MemoryHost,
} from '@evmix/core'
import type { ExecutionSnapshot, DebugSessionConfig, TraceSource } from './types'

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
  private executed: boolean = false

  constructor(config: DebugSessionConfig) {
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
        timestamp: config.hostConfig?.timestamp ?? BigInt(Math.floor(Date.now() / 1000)),
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
   * Execute the entire program and capture snapshots after each opcode
   */
  runToCompletion(): void {
    if (this.executed) return

    // Take initial snapshot (step 0 = before first opcode)
    this.captureSnapshot(0)

    let step = 0
    while (!this.interpreter.isHalted()) {
      this.interpreter.step()
      step++

      // Capture snapshot after EVERY opcode for accurate time-travel
      this.captureSnapshot(step)
    }

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
