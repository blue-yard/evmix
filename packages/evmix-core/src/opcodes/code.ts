/**
 * Code opcodes implementation
 *
 * CODESIZE, CODECOPY - Access current contract's bytecode
 * EXTCODESIZE, EXTCODECOPY, EXTCODEHASH - Access external contract's code
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'
import { Address } from '../types/Address'
import { Host } from '../host/Host'

/**
 * CODESIZE (0x38)
 * Push size of current contract's code
 * Gas: 2
 *
 * Pushes the size of the code running in the current environment to the stack.
 *
 * Stack effect: [] -> [size]
 */
export function executeCODESIZE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  bytecode: Uint8Array
): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'CODESIZE'
  )
  trace.record(gasEvent)

  // Get code size
  const size = Word256.from(BigInt(bytecode.length))

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
 * CODECOPY (0x39)
 * Copy code to memory
 * Gas: 3 + 3 * (size + 31) / 32 (word-aligned copy cost) + memory expansion
 *
 * Pops destOffset, offset, and size from the stack.
 * Copies 'size' bytes from code starting at 'offset' to memory at 'destOffset'.
 * If reading beyond code, zero bytes are used.
 *
 * Stack effect: [size, offset, destOffset] -> []
 * (destOffset is on top)
 */
export function executeCODECOPY(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  bytecode: Uint8Array
): void {
  // Charge base gas
  state.chargeGas(3n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    3n,
    'CODECOPY'
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

  // Pop offset (source offset in code) from stack
  const offsetWord = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent2)

  // Pop size from stack
  const sizeWord = stack.pop()
  const popEvent3 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    sizeWord
  )
  trace.record(popEvent3)

  // Convert to numbers
  const destOffset = Number(destOffsetWord.value)
  const offset = Number(offsetWord.value)
  const size = Number(sizeWord.value)

  // Charge gas for copy (3 gas per word)
  const wordCount = Math.ceil((size + 31) / 32)
  const copyGas = BigInt(wordCount) * 3n
  if (copyGas > 0n) {
    state.chargeGas(copyGas)
    const copyGasEvent = TraceEventBuilder.gasCharge(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      copyGas,
      'CODECOPY copy cost'
    )
    trace.record(copyGasEvent)
  }

  // Expand memory if needed
  if (size > 0) {
    const expansionCost = state.expandMemory(destOffset, size)
    if (expansionCost > 0n) {
      state.chargeGas(expansionCost)
      const expansionEvent = TraceEventBuilder.gasCharge(
        trace.getNextIndex(),
        state.pc,
        state.gasRemaining,
        expansionCost,
        'CODECOPY memory expansion'
      )
      trace.record(expansionEvent)
    }
  }

  // Copy data from code to memory (pad with zeros if beyond code)
  const data = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    if (offset + i < bytecode.length) {
      data[i] = bytecode[offset + i]
    } else {
      data[i] = 0 // Pad with zeros
    }
  }

  if (size > 0) {
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
 * EXTCODESIZE (0x3b)
 * Get size of external account's code
 * Gas: 100 (warm) / 2600 (cold) - using 100 for now
 *
 * Pops an address from the stack and pushes the code size of that account.
 *
 * Stack effect: [address] -> [size]
 */
export function executeEXTCODESIZE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge gas (100 for warm access)
  state.chargeGas(100n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    100n,
    'EXTCODESIZE'
  )
  trace.record(gasEvent)

  // Pop address from stack
  const addressWord = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    addressWord
  )
  trace.record(popEvent)

  // Convert Word256 to Address (take lowest 160 bits)
  const address = Address.from(addressWord.value & ((1n << 160n) - 1n))

  // Get code from host and get its size
  const code = host.getCode(address)
  const size = Word256.from(BigInt(code.length))

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
 * EXTCODECOPY (0x3c)
 * Copy external code to memory
 * Gas: 100 + 3 * (size + 31) / 32 + memory expansion
 *
 * Pops address, destOffset, offset, and size from the stack.
 * Copies 'size' bytes from the external account's code starting at 'offset'
 * to memory at 'destOffset'.
 *
 * Stack effect: [size, offset, destOffset, address] -> []
 * (address is on top)
 */
export function executeEXTCODECOPY(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge base gas (100 for warm access)
  state.chargeGas(100n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    100n,
    'EXTCODECOPY'
  )
  trace.record(gasEvent)

  // Pop address from stack (top)
  const addressWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    addressWord
  )
  trace.record(popEvent1)

  // Pop destOffset (destination offset in memory) from stack
  const destOffsetWord = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    destOffsetWord
  )
  trace.record(popEvent2)

  // Pop offset (source offset in code) from stack
  const offsetWord = stack.pop()
  const popEvent3 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    offsetWord
  )
  trace.record(popEvent3)

  // Pop size from stack
  const sizeWord = stack.pop()
  const popEvent4 = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    sizeWord
  )
  trace.record(popEvent4)

  // Convert to numbers
  const address = Address.from(addressWord.value & ((1n << 160n) - 1n))
  const destOffset = Number(destOffsetWord.value)
  const offset = Number(offsetWord.value)
  const size = Number(sizeWord.value)

  // Charge gas for copy (3 gas per word)
  const wordCount = Math.ceil((size + 31) / 32)
  const copyGas = BigInt(wordCount) * 3n
  if (copyGas > 0n) {
    state.chargeGas(copyGas)
    const copyGasEvent = TraceEventBuilder.gasCharge(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      copyGas,
      'EXTCODECOPY copy cost'
    )
    trace.record(copyGasEvent)
  }

  // Expand memory if needed
  if (size > 0) {
    const expansionCost = state.expandMemory(destOffset, size)
    if (expansionCost > 0n) {
      state.chargeGas(expansionCost)
      const expansionEvent = TraceEventBuilder.gasCharge(
        trace.getNextIndex(),
        state.pc,
        state.gasRemaining,
        expansionCost,
        'EXTCODECOPY memory expansion'
      )
      trace.record(expansionEvent)
    }
  }

  // Get code from host
  const code = host.getCode(address)

  // Copy data from external code to memory (pad with zeros if beyond code)
  const data = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    if (offset + i < code.length) {
      data[i] = code[offset + i]
    } else {
      data[i] = 0 // Pad with zeros
    }
  }

  if (size > 0) {
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
 * EXTCODEHASH (0x3f)
 * Get code hash of external account
 * Gas: 100 (warm) / 2600 (cold) - using 100 for now
 *
 * Pops an address from the stack and pushes the keccak256 hash of that
 * account's code. Returns 0 if the account does not exist, or the special
 * empty code hash for EOAs.
 *
 * Stack effect: [address] -> [hash]
 */
export function executeEXTCODEHASH(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge gas (100 for warm access)
  state.chargeGas(100n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    100n,
    'EXTCODEHASH'
  )
  trace.record(gasEvent)

  // Pop address from stack
  const addressWord = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    addressWord
  )
  trace.record(popEvent)

  // Convert Word256 to Address (take lowest 160 bits)
  const address = Address.from(addressWord.value & ((1n << 160n) - 1n))

  // Get code hash from host
  const hash = host.getCodeHash(address)

  // Push hash to stack
  stack.push(hash)
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    hash
  )
  trace.record(pushEvent)

  // Advance PC
  state.pc += 1
}
