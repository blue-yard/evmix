/**
 * Arithmetic opcodes implementation
 *
 * All arithmetic operations are performed modulo 2^256
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'

/**
 * ADD (0x01)
 * Pops two values, pushes their sum (mod 2^256)
 * Gas: 3
 */
export function executeAdd(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'ADD'
  )
  trace.record(gasEvent)

  // Pop two values
  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    b
  )
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    a
  )
  trace.record(popEvent2)

  // Compute sum
  const result = a.add(b)

  // Push result
  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    result
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}

/**
 * MUL (0x02)
 * Pops two values, pushes their product (mod 2^256)
 * Gas: 5
 */
export function executeMul(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge gas
  state.chargeGas(5n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    5n,
    'MUL'
  )
  trace.record(gasEvent)

  // Pop two values
  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    b
  )
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    a
  )
  trace.record(popEvent2)

  // Compute product
  const result = a.mul(b)

  // Push result
  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    result
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}

/**
 * SUB (0x03)
 * Pops two values, pushes their difference (mod 2^256)
 * Gas: 3
 */
export function executeSub(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'SUB'
  )
  trace.record(gasEvent)

  // Pop two values
  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    b
  )
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    a
  )
  trace.record(popEvent2)

  // Compute difference
  const result = a.sub(b)

  // Push result
  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    result
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}

/**
 * DIV (0x04)
 * Pops two values, pushes their quotient (integer division)
 * Division by zero returns 0
 * Gas: 5
 */
export function executeDiv(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge gas
  state.chargeGas(5n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    5n,
    'DIV'
  )
  trace.record(gasEvent)

  // Pop two values
  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    b
  )
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    a
  )
  trace.record(popEvent2)

  // Compute quotient (handles division by zero)
  const result = a.div(b)

  // Push result
  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    result
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}
