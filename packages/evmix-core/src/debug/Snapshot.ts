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
