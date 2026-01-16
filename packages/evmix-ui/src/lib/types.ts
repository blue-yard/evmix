import type { TraceEvent, HaltReason } from '@evmix/core'

// Re-export HaltReason from core for convenience
export type { HaltReason } from '@evmix/core'

/**
 * A snapshot of execution state at a specific point
 *
 * NOTE: This is a UI-specific snapshot format optimized for display.
 * It differs from @evmix/core's Snapshot:
 * - stack: string[] (hex) vs Word256[] in core
 * - includes memorySize for UI convenience
 *
 * @see {@link @evmix/core Snapshot} for the core version
 */
export interface ExecutionSnapshot {
  stepIndex: number
  pc: number
  gasRemaining: bigint
  stack: string[] // hex values for UI display
  memorySize: number
  memory: Uint8Array
  halted: boolean
  haltReason?: HaltReason
}

/**
 * Configuration for creating a UI debug session
 *
 * NOTE: This differs from @evmix/core's DebugSessionConfig which
 * uses a MemoryHost directly. This config uses string addresses
 * for easier UI integration.
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
