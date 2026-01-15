/**
 * Bitwise logic and bit manipulation opcodes
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'

/**
 * AND (0x16)
 * Bitwise AND operation
 * Pops two values, pushes a & b
 * Gas: 3
 */
export function executeAND(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'AND'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.and(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * OR (0x17)
 * Bitwise OR operation
 * Pops two values, pushes a | b
 * Gas: 3
 */
export function executeOR(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'OR'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.or(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * XOR (0x18)
 * Bitwise XOR operation
 * Pops two values, pushes a ^ b
 * Gas: 3
 */
export function executeXOR(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'XOR'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.xor(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * NOT (0x19)
 * Bitwise NOT operation
 * Pops one value, pushes ~a
 * Gas: 3
 */
export function executeNOT(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'NOT'
  )
  trace.record(gasEvent)

  const a = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent)

  const result = a.not()

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * BYTE (0x1a)
 * Extract a single byte from a word
 * Stack: [value, index] -> [byte] (index on top, value below)
 * Gas: 3
 */
export function executeBYTE(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'BYTE'
  )
  trace.record(gasEvent)

  // Stack order: index is on top, value is below
  const index = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, index)
  trace.record(popEvent1)

  const value = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, value)
  trace.record(popEvent2)

  // Get byte at index (0 is MSB, returns 0 if index >= 32)
  const indexNum = index.value >= 32n ? 32 : Number(index.value)
  const byteValue = value.getByte(indexNum)
  const result = Word256.fromNumber(byteValue)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * SHL (0x1b)
 * Logical left shift
 * Stack: [value, shift] -> [value << shift] (shift on top, value below)
 * Gas: 3
 */
export function executeSHL(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'SHL'
  )
  trace.record(gasEvent)

  // Stack order: shift is on top, value is below
  const shift = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, shift)
  trace.record(popEvent1)

  const value = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, value)
  trace.record(popEvent2)

  const result = value.shl(shift)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * SHR (0x1c)
 * Logical right shift
 * Stack: [value, shift] -> [value >> shift] (shift on top, value below)
 * Gas: 3
 */
export function executeSHR(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'SHR'
  )
  trace.record(gasEvent)

  // Stack order: shift is on top, value is below
  const shift = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, shift)
  trace.record(popEvent1)

  const value = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, value)
  trace.record(popEvent2)

  const result = value.shr(shift)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * SAR (0x1d)
 * Arithmetic right shift (signed)
 * Stack: [value, shift] -> [value >> shift] (shift on top, value below)
 * Sign bit is extended (fills with 1s for negative values)
 * Gas: 3
 */
export function executeSAR(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'SAR'
  )
  trace.record(gasEvent)

  // Stack order: shift is on top, value is below
  const shift = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, shift)
  trace.record(popEvent1)

  const value = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, value)
  trace.record(popEvent2)

  const result = value.sar(shift)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}
