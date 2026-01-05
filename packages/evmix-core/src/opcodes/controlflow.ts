/**
 * Control flow opcodes implementation
 *
 * Phase 2: PC, JUMP, JUMPI, JUMPDEST
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'
import { HaltReason } from '../state/HaltReason'

/**
 * PC (0x58)
 * Pushes the current program counter to the stack
 * Gas: 2
 *
 * Note: The PC value pushed is the counter BEFORE incrementing for this instruction.
 * This is important for understanding jump behavior.
 */
export function executePC(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'PC'
  )
  trace.record(gasEvent)

  // Push current PC to stack
  const pcValue = Word256.from(BigInt(state.pc))
  stack.push(pcValue)

  // Emit stack push event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    pcValue
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}

/**
 * JUMPDEST (0x5b)
 * Marks a valid jump destination
 * Gas: 1
 *
 * This is a no-op during execution, but its presence is validated
 * when JUMP or JUMPI attempts to jump to a location.
 * A JUMP/JUMPI can only target a JUMPDEST instruction.
 */
export function executeJUMPDEST(
  state: MachineState,
  _stack: Stack,
  trace: TraceCollector
): void {
  // Charge gas
  state.chargeGas(1n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    1n,
    'JUMPDEST'
  )
  trace.record(gasEvent)

  // JUMPDEST is a no-op - just advance PC
  state.pc += 1
}

/**
 * JUMP (0x56)
 * Unconditional jump to a destination
 * Gas: 8
 *
 * Pops a destination from the stack and jumps to it.
 * The destination MUST be a JUMPDEST instruction, or execution halts with INVALID_JUMP.
 *
 * Stack effect: [dest] -> []
 *
 * Common pitfalls:
 * - Jumping to an invalid destination (not JUMPDEST)
 * - Jumping outside bytecode bounds
 * - Jumping into the middle of a PUSH operation's data
 */
export function executeJUMP(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  bytecode: Uint8Array,
  validJumpDests: Set<number>
): void {
  // Charge gas
  state.chargeGas(8n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    8n,
    'JUMP'
  )
  trace.record(gasEvent)

  // Pop destination from stack
  const dest = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    dest
  )
  trace.record(popEvent)

  // Convert to number (destinations beyond bytecode will be caught)
  const destPC = Number(dest.value)

  // Emit jump event
  const jumpEvent = TraceEventBuilder.jump(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    state.pc,
    destPC,
    false, // not conditional
    true // always taken for JUMP
  )
  trace.record(jumpEvent)

  // Validate jump destination
  if (destPC >= bytecode.length) {
    // Jump outside bytecode bounds
    state.halt(HaltReason.INVALID_JUMP)
    return
  }

  if (!validJumpDests.has(destPC)) {
    // Not a valid JUMPDEST
    state.halt(HaltReason.INVALID_JUMP)
    return
  }

  // Perform the jump
  state.pc = destPC
}

/**
 * JUMPI (0x57)
 * Conditional jump to a destination
 * Gas: 10
 *
 * Pops a destination and a condition from the stack.
 * If condition is non-zero, jumps to destination (which must be JUMPDEST).
 * Otherwise, continues to next instruction.
 *
 * Stack effect: [dest, condition] -> []
 *
 * Common pitfalls:
 * - Same validation rules as JUMP apply if jump is taken
 * - Condition is any non-zero value (not just 1)
 */
export function executeJUMPI(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  bytecode: Uint8Array,
  validJumpDests: Set<number>
): void {
  // Charge gas
  state.chargeGas(10n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    10n,
    'JUMPI'
  )
  trace.record(gasEvent)

  // Pop condition from stack
  const condition = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    condition
  )
  trace.record(popEvent1)

  // Pop destination from stack
  const dest = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    dest
  )
  trace.record(popEvent2)

  // Check if jump should be taken (condition is non-zero)
  const shouldJump = condition.value !== 0n
  const destPC = Number(dest.value)

  // Emit jump event
  const jumpEvent = TraceEventBuilder.jump(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    state.pc,
    destPC,
    true, // conditional
    shouldJump
  )
  trace.record(jumpEvent)

  if (!shouldJump) {
    // Condition is false, continue to next instruction
    state.pc += 1
    return
  }

  // Validate jump destination
  if (destPC >= bytecode.length) {
    // Jump outside bytecode bounds
    state.halt(HaltReason.INVALID_JUMP)
    return
  }

  if (!validJumpDests.has(destPC)) {
    // Not a valid JUMPDEST
    state.halt(HaltReason.INVALID_JUMP)
    return
  }

  // Perform the jump
  state.pc = destPC
}

/**
 * Build the set of valid jump destinations
 *
 * A valid jump destination is any JUMPDEST (0x5b) opcode in the bytecode.
 * However, we must not count JUMPDEST bytes that appear in PUSH data.
 *
 * This function scans the bytecode and identifies all valid JUMPDEST positions.
 */
export function buildJumpDestinations(bytecode: Uint8Array): Set<number> {
  const validDests = new Set<number>()

  let i = 0
  while (i < bytecode.length) {
    const opcode = bytecode[i]

    // Check if this is a JUMPDEST
    if (opcode === 0x5b) {
      validDests.add(i)
      i++
      continue
    }

    // Check if this is a PUSH operation
    if (opcode >= 0x60 && opcode <= 0x7f) {
      // Skip PUSH data bytes
      const numBytes = opcode - 0x5f
      i += 1 + numBytes
      continue
    }

    // Regular opcode
    i++
  }

  return validDests
}
