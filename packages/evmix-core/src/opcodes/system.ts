/**
 * System opcodes implementation
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { HaltReason } from '../state/HaltReason'

/**
 * STOP (0x00)
 * Halts execution
 * Gas: 0
 */
export function executeStop(state: MachineState, _stack: Stack, _trace: TraceCollector): void {
  // STOP costs no gas and immediately halts
  state.halt(HaltReason.STOP)
}
