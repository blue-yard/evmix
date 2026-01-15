/**
 * Cryptographic opcodes implementation
 *
 * KECCAK256 (SHA3)
 */

import { keccak_256 } from '@noble/hashes/sha3'
import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'

/**
 * KECCAK256 (0x20)
 * Compute Keccak-256 hash of memory region
 * Gas: 30 + 6 * ceil(size / 32) + memory expansion cost
 *
 * Pops offset and size from stack, reads size bytes from memory at offset,
 * computes Keccak-256 hash, and pushes the 32-byte result.
 *
 * Stack effect: [size, offset] -> [hash]
 * (offset is on top)
 */
export function executeKECCAK256(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Pop offset from stack (top)
  const offsetWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent1)

  // Pop size from stack
  const sizeWord = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    sizeWord
  )
  trace.record(popEvent2)

  // Convert to numbers
  const offset = Number(offsetWord.value)
  const size = Number(sizeWord.value)

  // Calculate gas: 30 + 6 * ceil(size / 32)
  const wordCount = size === 0 ? 0n : BigInt(Math.ceil(size / 32))
  const gasCost = 30n + 6n * wordCount

  // Charge base gas
  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'KECCAK256'
  )
  trace.record(gasEvent)

  // Expand memory if needed and charge gas
  if (size > 0) {
    const expansionCost = state.expandMemory(offset, size)
    if (expansionCost > 0n) {
      state.chargeGas(expansionCost)
      const expansionEvent = TraceEventBuilder.gasCharge(
        trace.getNextIndex(),
        state.pc,
        state.gasRemaining,
        expansionCost,
        'KECCAK256 memory expansion'
      )
      trace.record(expansionEvent)
    }
  }

  // Read bytes from memory
  let data: Uint8Array
  if (size === 0) {
    data = new Uint8Array(0)
  } else {
    data = state.readMemory(offset, size)

    // Emit memory read event
    const readEvent = TraceEventBuilder.memoryRead(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      offset,
      size
    )
    trace.record(readEvent)
  }

  // Compute Keccak-256 hash
  const hash = keccak_256(data)

  // Convert hash bytes to Word256 (big-endian)
  const result = Word256.fromBytes(hash)

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
