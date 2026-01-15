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

/**
 * SDIV (0x05)
 * Signed integer division
 * Division by zero returns 0
 * Gas: 5
 */
export function executeSdiv(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(5n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    5n,
    'SDIV'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.sdiv(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * MOD (0x06)
 * Unsigned modulo operation
 * Returns 0 if divisor is 0
 * Gas: 5
 */
export function executeMod(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(5n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    5n,
    'MOD'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.mod(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * SMOD (0x07)
 * Signed modulo operation
 * Returns 0 if divisor is 0
 * Gas: 5
 */
export function executeSmod(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(5n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    5n,
    'SMOD'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.smod(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * ADDMOD (0x08)
 * Addition modulo N: (a + b) % N
 * Intermediate sum uses arbitrary precision (no overflow)
 * Returns 0 if N is 0
 * Gas: 8
 */
export function executeAddmod(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(8n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    8n,
    'ADDMOD'
  )
  trace.record(gasEvent)

  const n = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, n)
  trace.record(popEvent1)

  const b = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent2)

  const a = stack.pop()
  const popEvent3 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent3)

  const result = a.addmod(b, n)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * MULMOD (0x09)
 * Multiplication modulo N: (a * b) % N
 * Intermediate product uses arbitrary precision (no overflow)
 * Returns 0 if N is 0
 * Gas: 8
 */
export function executeMulmod(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(8n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    8n,
    'MULMOD'
  )
  trace.record(gasEvent)

  const n = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, n)
  trace.record(popEvent1)

  const b = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent2)

  const a = stack.pop()
  const popEvent3 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent3)

  const result = a.mulmod(b, n)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * EXP (0x0a)
 * Exponentiation: a^b mod 2^256
 * Gas: 10 + 50 * byte_size(exponent)
 */
export function executeExp(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Peek at exponent to calculate gas (we'll pop it properly below)
  const expValue = stack.peek().value

  // Gas = 10 + 50 * byte_size(exponent)
  // byte_size is the number of bytes needed to represent the exponent
  let byteSize = 0n
  let temp = expValue
  while (temp > 0n) {
    byteSize++
    temp >>= 8n
  }
  const gasCost = 10n + 50n * byteSize

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'EXP'
  )
  trace.record(gasEvent)

  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const a = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, a)
  trace.record(popEvent2)

  const result = a.exp(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * SIGNEXTEND (0x0b)
 * Sign-extend x from (b+1) bytes
 * Stack: [x, b] -> [result] (b on top, x below)
 * If b >= 31, value is unchanged
 * Gas: 5
 */
export function executeSignextend(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(5n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    5n,
    'SIGNEXTEND'
  )
  trace.record(gasEvent)

  // Stack order: b (byte position) is on top, x (value) is below
  const b = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, b)
  trace.record(popEvent1)

  const x = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, x)
  trace.record(popEvent2)

  const result = x.signExtend(b)

  stack.push(result)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, result)
  trace.record(pushEvent)

  state.pc += 1
}
