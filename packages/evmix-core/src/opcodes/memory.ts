/**
 * Memory opcodes implementation
 *
 * Phase 3: MLOAD, MSTORE, MSTORE8, MSIZE
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'

/**
 * MLOAD (0x51)
 * Load a 32-byte word from memory
 * Gas: 3 + memory expansion cost
 *
 * Pops an offset from the stack and loads a 32-byte word from memory at that offset.
 * If memory needs to be expanded, additional gas is charged.
 *
 * Stack effect: [offset] -> [value]
 */
export function executeMLOAD(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge base gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'MLOAD'
  )
  trace.record(gasEvent)

  // Pop offset from stack
  const offsetWord = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent)

  // Convert to number (memory offsets must fit in JS number range)
  const offset = Number(offsetWord.value)

  // Expand memory if needed and charge gas
  const expansionCost = state.expandMemory(offset, 32)
  if (expansionCost > 0n) {
    state.chargeGas(expansionCost)
    const expansionEvent = TraceEventBuilder.gasCharge(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      expansionCost,
      'MLOAD memory expansion'
    )
    trace.record(expansionEvent)
  }

  // Read 32 bytes from memory
  const data = state.readMemory(offset, 32)

  // Emit memory read event
  const readEvent = TraceEventBuilder.memoryRead(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offset,
    32
  )
  trace.record(readEvent)

  // Convert bytes to Word256 (big-endian)
  let value = 0n
  for (let i = 0; i < data.length; i++) {
    value = (value << 8n) | BigInt(data[i])
  }

  // Pad with zeros if we read less than 32 bytes
  // (this can happen if reading beyond allocated memory)
  for (let i = data.length; i < 32; i++) {
    value = value << 8n
  }

  const result = Word256.from(value)

  // Push result to stack
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
 * MSTORE (0x52)
 * Store a 32-byte word to memory
 * Gas: 3 + memory expansion cost
 *
 * Pops an offset and a value from the stack, then stores the 32-byte value
 * to memory at that offset.
 *
 * Stack effect: [value, offset] -> []
 * (offset is on top)
 */
export function executeMSTORE(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge base gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'MSTORE'
  )
  trace.record(gasEvent)

  // Pop offset from stack (top)
  const offsetWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent1)

  // Pop value from stack
  const value = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    value
  )
  trace.record(popEvent2)

  // Convert offset to number
  const offset = Number(offsetWord.value)

  // Expand memory if needed and charge gas
  const expansionCost = state.expandMemory(offset, 32)
  if (expansionCost > 0n) {
    state.chargeGas(expansionCost)
    const expansionEvent = TraceEventBuilder.gasCharge(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      expansionCost,
      'MSTORE memory expansion'
    )
    trace.record(expansionEvent)
  }

  // Convert Word256 to 32 bytes (big-endian)
  const bytes = new Uint8Array(32)
  let val = value.value
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(val & 0xffn)
    val = val >> 8n
  }

  // Write to memory
  state.writeMemory(offset, bytes)

  // Emit memory write event
  const writeEvent = TraceEventBuilder.memoryWrite(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offset,
    bytes
  )
  trace.record(writeEvent)

  // Advance PC
  state.pc += 1
}

/**
 * MSTORE8 (0x53)
 * Store a single byte to memory
 * Gas: 3 + memory expansion cost
 *
 * Pops an offset and a value from the stack, then stores the least significant
 * byte of the value to memory at that offset.
 *
 * Stack effect: [value, offset] -> []
 * (offset is on top)
 */
export function executeMSTORE8(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge base gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'MSTORE8'
  )
  trace.record(gasEvent)

  // Pop offset from stack (top)
  const offsetWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent1)

  // Pop value from stack
  const value = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    value
  )
  trace.record(popEvent2)

  // Convert offset to number
  const offset = Number(offsetWord.value)

  // Expand memory if needed and charge gas (only 1 byte)
  const expansionCost = state.expandMemory(offset, 1)
  if (expansionCost > 0n) {
    state.chargeGas(expansionCost)
    const expansionEvent = TraceEventBuilder.gasCharge(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      expansionCost,
      'MSTORE8 memory expansion'
    )
    trace.record(expansionEvent)
  }

  // Extract least significant byte
  const byte = new Uint8Array([Number(value.value & 0xffn)])

  // Write single byte to memory
  state.writeMemory(offset, byte)

  // Emit memory write event
  const writeEvent = TraceEventBuilder.memoryWrite(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offset,
    byte
  )
  trace.record(writeEvent)

  // Advance PC
  state.pc += 1
}

/**
 * MSIZE (0x59)
 * Get current memory size
 * Gas: 2
 *
 * Pushes the current size of memory in bytes to the stack.
 * Memory size is always a multiple of 32 bytes.
 *
 * Stack effect: [] -> [size]
 */
export function executeMSIZE(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'MSIZE'
  )
  trace.record(gasEvent)

  // Get current memory size
  const size = Word256.from(BigInt(state.getMemorySize()))

  // Push size to stack
  stack.push(size)
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    size
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}
