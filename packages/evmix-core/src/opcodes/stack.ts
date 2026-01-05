/**
 * Stack manipulation opcodes implementation
 *
 * POP, DUP1-DUP16, SWAP1-SWAP16
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'

/**
 * POP (0x50)
 * Removes the top item from the stack
 * Gas: 2
 *
 * Stack effect: [value] -> []
 */
export function executePOP(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'POP'
  )
  trace.record(gasEvent)

  // Pop value from stack
  const value = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    value
  )
  trace.record(popEvent)

  // Advance PC
  state.pc += 1
}

/**
 * DUP1-DUP16 (0x80-0x8f)
 * Duplicates the Nth stack item to the top
 * Gas: 3
 *
 * DUP1 duplicates the 1st item (top)
 * DUP2 duplicates the 2nd item
 * etc.
 *
 * Stack effect (for DUPn): [... nth, ..., 2nd, 1st] -> [... nth, ..., 2nd, 1st, nth]
 */
export function executeDUP(
  opcode: number,
  state: MachineState,
  stack: Stack,
  trace: TraceCollector
): void {
  const n = opcode - 0x7f // DUP1 = 0x80, so 0x80 - 0x7f = 1

  // Charge gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    `DUP${n}`
  )
  trace.record(gasEvent)

  // Get the value that will be duplicated (before the dup)
  const value = stack.peekAt(n - 1)

  // Duplicate the nth item using Stack's built-in method
  stack.dup(n)

  // Emit stack push event for the duplicated value
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    value
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}

/**
 * SWAP1-SWAP16 (0x90-0x9f)
 * Swaps the top stack item with the Nth item
 * Gas: 3
 *
 * SWAP1 swaps the 1st and 2nd items
 * SWAP2 swaps the 1st and 3rd items
 * etc.
 *
 * Stack effect (for SWAPn): [... nth, ..., 2nd, 1st] -> [... 1st, ..., 2nd, nth]
 */
export function executeSWAP(
  opcode: number,
  state: MachineState,
  stack: Stack,
  trace: TraceCollector
): void {
  const n = opcode - 0x8f // SWAP1 = 0x90, so 0x90 - 0x8f = 1

  // Charge gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    `SWAP${n}`
  )
  trace.record(gasEvent)

  // Perform the swap using Stack's built-in method
  stack.swap(n)

  // Note: We don't emit individual pop/push events for SWAP
  // because it's a single atomic operation that modifies the stack in place

  // Advance PC
  state.pc += 1
}
