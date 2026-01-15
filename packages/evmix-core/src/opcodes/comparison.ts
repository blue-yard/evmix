/**
 * Comparison opcodes implementation
 *
 * All comparison operations push 1 for true, 0 for false
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'

/**
 * LT (0x10)
 * Unsigned less than comparison
 * Pops two values, pushes 1 if a < b, else 0
 * Gas: 3
 */
export function executeLT(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'LT'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.lt(b) ? Word256.one() : Word256.zero()

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * GT (0x11)
 * Unsigned greater than comparison
 * Pops two values, pushes 1 if a > b, else 0
 * Gas: 3
 */
export function executeGT(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'GT'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.gt(b) ? Word256.one() : Word256.zero()

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * SLT (0x12)
 * Signed less than comparison
 * Pops two values (interpreted as two's complement), pushes 1 if a < b, else 0
 * Gas: 3
 */
export function executeSLT(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'SLT'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.slt(b) ? Word256.one() : Word256.zero()

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * SGT (0x13)
 * Signed greater than comparison
 * Pops two values (interpreted as two's complement), pushes 1 if a > b, else 0
 * Gas: 3
 */
export function executeSGT(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'SGT'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.sgt(b) ? Word256.one() : Word256.zero()

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * EQ (0x14)
 * Equality comparison
 * Pops two values, pushes 1 if a == b, else 0
 * Gas: 3
 */
export function executeEQ(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'EQ'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.eq(b) ? Word256.one() : Word256.zero()

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * ISZERO (0x15)
 * Check if value is zero
 * Pops one value, pushes 1 if a == 0, else 0
 * Gas: 3
 */
export function executeISZERO(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'ISZERO'
  )
  trace.record(gasEvent)

  const a = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent)

  const result = a.isZero() ? Word256.one() : Word256.zero()

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}
