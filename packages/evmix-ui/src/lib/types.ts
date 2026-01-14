import type { TraceEvent, HaltReason } from '@evmix/core'

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
