import { Word256 } from '../types/Word256'
import { TraceEvent, StorageReadEvent, StorageWriteEvent } from '../trace/TraceEvent'

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
      // Storage events store keys as hex strings with 0x prefix
      return (ctx.lastEvent as StorageWriteEvent).key === condition.key.toHexWith0x()
    case 'storageRead':
      if (ctx.lastEvent?.type !== 'storage.read') return false
      if (condition.key === undefined) return true
      return (ctx.lastEvent as StorageReadEvent).key === condition.key.toHexWith0x()
    case 'custom':
      return condition.fn(ctx)
    default:
      return false
  }
}
