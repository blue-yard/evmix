/**
 * Data and return opcodes implementation
 *
 * Phase 3: CALLDATALOAD, CALLDATASIZE, CALLDATACOPY, RETURN, REVERT
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'
import { HaltReason } from '../state/HaltReason'

/**
 * CALLDATALOAD (0x35)
 * Load a 32-byte word from calldata
 * Gas: 3
 *
 * Pops an offset from the stack and loads a 32-byte word from calldata.
 * If reading beyond calldata, zero bytes are returned.
 *
 * Stack effect: [offset] -> [value]
 */
export function executeCALLDATALOAD(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  calldata: Uint8Array
): void {
  // Charge gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'CALLDATALOAD'
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

  // Convert to number
  const offset = Number(offsetWord.value)

  // Read 32 bytes from calldata (pad with zeros if beyond calldata)
  const data = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    if (offset + i < calldata.length) {
      data[i] = calldata[offset + i]
    } else {
      data[i] = 0 // Pad with zeros
    }
  }

  // Convert bytes to Word256 (big-endian)
  let value = 0n
  for (let i = 0; i < 32; i++) {
    value = (value << 8n) | BigInt(data[i])
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
 * CALLDATASIZE (0x36)
 * Get size of calldata
 * Gas: 2
 *
 * Pushes the size of calldata in bytes to the stack.
 *
 * Stack effect: [] -> [size]
 */
export function executeCALLDATASIZE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  calldata: Uint8Array
): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'CALLDATASIZE'
  )
  trace.record(gasEvent)

  // Get calldata size
  const size = Word256.from(BigInt(calldata.length))

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

/**
 * CALLDATACOPY (0x37)
 * Copy calldata to memory
 * Gas: 3 + 3 * (number of words copied) + memory expansion cost
 *
 * Pops destOffset, offset, and length from the stack.
 * Copies 'length' bytes from calldata starting at 'offset' to memory at 'destOffset'.
 *
 * Stack effect: [length, offset, destOffset] -> []
 * (destOffset is on top)
 */
export function executeCALLDATACOPY(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  calldata: Uint8Array
): void {
  // Charge base gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'CALLDATACOPY'
  )
  trace.record(gasEvent)

  // Pop destOffset (destination offset in memory) from stack (top)
  const destOffsetWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    destOffsetWord
  )
  trace.record(popEvent1)

  // Pop offset (source offset in calldata) from stack
  const offsetWord = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent2)

  // Pop length from stack
  const lengthWord = stack.pop()
  const popEvent3 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    lengthWord
  )
  trace.record(popEvent3)

  // Convert to numbers
  const destOffset = Number(destOffsetWord.value)
  const offset = Number(offsetWord.value)
  const length = Number(lengthWord.value)

  // Charge gas for copy (3 gas per word)
  const wordCount = Math.ceil(length / 32)
  const copyGas = BigInt(wordCount) * 3n
  if (copyGas > 0n) {
    state.chargeGas(copyGas)
    const copyGasEvent = TraceEventBuilder.gasCharge(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      copyGas,
      'CALLDATACOPY copy cost'
    )
    trace.record(copyGasEvent)
  }

  // Expand memory if needed
  if (length > 0) {
    const expansionCost = state.expandMemory(destOffset, length)
    if (expansionCost > 0n) {
      state.chargeGas(expansionCost)
      const expansionEvent = TraceEventBuilder.gasCharge(
        trace.getNextIndex(),
        state.pc,
        state.gasRemaining,
        expansionCost,
        'CALLDATACOPY memory expansion'
      )
      trace.record(expansionEvent)
    }
  }

  // Copy data from calldata to memory (pad with zeros if beyond calldata)
  const data = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    if (offset + i < calldata.length) {
      data[i] = calldata[offset + i]
    } else {
      data[i] = 0 // Pad with zeros
    }
  }

  if (length > 0) {
    // Write to memory
    state.writeMemory(destOffset, data)

    // Emit memory write event
    const writeEvent = TraceEventBuilder.memoryWrite(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      destOffset,
      data
    )
    trace.record(writeEvent)
  }

  // Advance PC
  state.pc += 1
}

/**
 * RETURN (0xf3)
 * Halt execution and return data
 * Gas: 0
 *
 * Pops offset and length from the stack, reads that range from memory,
 * stores it as return data, and halts execution successfully.
 *
 * Stack effect: [length, offset] -> (halts)
 * (offset is on top)
 */
export function executeRETURN(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // RETURN has no base gas cost, but memory expansion is charged

  // Pop offset from stack (top)
  const offsetWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent1)

  // Pop length from stack
  const lengthWord = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    lengthWord
  )
  trace.record(popEvent2)

  // Convert to numbers
  const offset = Number(offsetWord.value)
  const length = Number(lengthWord.value)

  // Expand memory if needed and charge gas
  if (length > 0) {
    const expansionCost = state.expandMemory(offset, length)
    if (expansionCost > 0n) {
      state.chargeGas(expansionCost)
      const expansionEvent = TraceEventBuilder.gasCharge(
        trace.getNextIndex(),
        state.pc,
        state.gasRemaining,
        expansionCost,
        'RETURN memory expansion'
      )
      trace.record(expansionEvent)
    }

    // Read return data from memory
    state.returnData = state.readMemory(offset, length)
  } else {
    state.returnData = new Uint8Array(0)
  }

  // Halt execution
  state.halt(HaltReason.RETURN)
}

/**
 * REVERT (0xfd)
 * Halt execution and revert with data
 * Gas: 0
 *
 * Similar to RETURN, but signals that execution failed.
 * Pops offset and length from the stack, reads that range from memory,
 * stores it as return data, and halts execution with REVERT status.
 *
 * Stack effect: [length, offset] -> (halts)
 * (offset is on top)
 */
export function executeREVERT(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // REVERT has no base gas cost, but memory expansion is charged

  // Pop offset from stack (top)
  const offsetWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent1)

  // Pop length from stack
  const lengthWord = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    lengthWord
  )
  trace.record(popEvent2)

  // Convert to numbers
  const offset = Number(offsetWord.value)
  const length = Number(lengthWord.value)

  // Expand memory if needed and charge gas
  if (length > 0) {
    const expansionCost = state.expandMemory(offset, length)
    if (expansionCost > 0n) {
      state.chargeGas(expansionCost)
      const expansionEvent = TraceEventBuilder.gasCharge(
        trace.getNextIndex(),
        state.pc,
        state.gasRemaining,
        expansionCost,
        'REVERT memory expansion'
      )
      trace.record(expansionEvent)
    }

    // Read return data from memory
    state.returnData = state.readMemory(offset, length)
  } else {
    state.returnData = new Uint8Array(0)
  }

  // Halt execution with REVERT
  state.halt(HaltReason.REVERT)
}
