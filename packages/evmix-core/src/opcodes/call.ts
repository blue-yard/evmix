/**
 * Call-related opcodes implementation
 *
 * RETURNDATASIZE, RETURNDATACOPY, CALL, STATICCALL, DELEGATECALL, CALLCODE
 * CREATE, CREATE2, SELFDESTRUCT
 */

import { MachineState } from '../state/MachineState'
import { HaltReason } from '../state/HaltReason'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'
import { Address } from '../types/Address'
import { Host, CallParams, CallKind, CreateParams } from '../host/Host'

/**
 * RETURNDATASIZE (0x3d)
 * Get size of return data from last call
 * Gas: 2
 *
 * Stack effect: [] -> [size]
 */
export function executeRETURNDATASIZE(state: MachineState, stack: Stack, trace: TraceCollector): void {
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'RETURNDATASIZE'
  )
  trace.record(gasEvent)

  const size = Word256.from(BigInt(state.returnData.length))

  stack.push(size)
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    size
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * RETURNDATACOPY (0x3e)
 * Copy return data to memory
 * Gas: 3 + 3 * ceil(length / 32) + memory expansion
 *
 * Stack effect: [length, offset, destOffset] -> []
 * (destOffset is on top)
 */
export function executeRETURNDATACOPY(state: MachineState, stack: Stack, trace: TraceCollector): void {
  // Pop destOffset (memory destination)
  const destOffsetWord = stack.pop()
  const popEvent1 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, destOffsetWord)
  trace.record(popEvent1)

  // Pop offset (return data source offset)
  const offsetWord = stack.pop()
  const popEvent2 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, offsetWord)
  trace.record(popEvent2)

  // Pop length
  const lengthWord = stack.pop()
  const popEvent3 = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, lengthWord)
  trace.record(popEvent3)

  const destOffset = Number(destOffsetWord.value)
  const offset = Number(offsetWord.value)
  const length = Number(lengthWord.value)

  // Check bounds - reading past return data is invalid
  if (offset + length > state.returnData.length) {
    state.halt({ type: 'error', message: 'Return data out of bounds' } as any)
    throw new Error('Return data out of bounds')
  }

  // Calculate gas: 3 + 3 * ceil(length / 32)
  const wordCount = length === 0 ? 0n : BigInt(Math.ceil(length / 32))
  const gasCost = 3n + 3n * wordCount

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'RETURNDATACOPY'
  )
  trace.record(gasEvent)

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
        'RETURNDATACOPY memory expansion'
      )
      trace.record(expansionEvent)
    }

    // Copy return data to memory
    const data = state.returnData.slice(offset, offset + length)
    state.writeMemory(destOffset, data)

    const writeEvent = TraceEventBuilder.memoryWrite(
      trace.getNextIndex(),
      state.pc,
      state.gasRemaining,
      destOffset,
      data
    )
    trace.record(writeEvent)
  }

  state.pc += 1
}

/**
 * Calculate gas to forward for a call (EIP-150 63/64 rule)
 */
function calculateCallGas(availableGas: bigint, requestedGas: bigint): bigint {
  // After EIP-150, at most 63/64 of remaining gas can be forwarded
  const maxGas = availableGas - (availableGas / 64n)
  return requestedGas < maxGas ? requestedGas : maxGas
}

/**
 * CALL (0xf1)
 * Call another contract
 * Gas: Complex (base + memory + call value + new account)
 *
 * Stack: [retLength, retOffset, argsLength, argsOffset, value, to, gas] -> [success]
 * (gas is on top)
 */
export function executeCALL(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host,
  currentAddress: Address,
  depth: number
): void {
  // Pop arguments (gas on top)
  const gasWord = stack.pop()
  const popGas = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, gasWord)
  trace.record(popGas)

  const toWord = stack.pop()
  const popTo = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, toWord)
  trace.record(popTo)

  const valueWord = stack.pop()
  const popValue = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, valueWord)
  trace.record(popValue)

  const argsOffsetWord = stack.pop()
  const popArgsOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsOffsetWord)
  trace.record(popArgsOffset)

  const argsLengthWord = stack.pop()
  const popArgsLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsLengthWord)
  trace.record(popArgsLength)

  const retOffsetWord = stack.pop()
  const popRetOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retOffsetWord)
  trace.record(popRetOffset)

  const retLengthWord = stack.pop()
  const popRetLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retLengthWord)
  trace.record(popRetLength)

  const requestedGas = gasWord.value
  const to = Address.fromWord256(toWord)
  const value = valueWord.value
  const argsOffset = Number(argsOffsetWord.value)
  const argsLength = Number(argsLengthWord.value)
  const retOffset = Number(retOffsetWord.value)
  const retLength = Number(retLengthWord.value)

  // Base gas cost for CALL
  let gasCost = 100n // Warm access (simplified)

  // Add value transfer cost
  if (value > 0n) {
    gasCost += 9000n // CALL_VALUE cost
  }

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'CALL'
  )
  trace.record(gasEvent)

  // Expand memory for args and return data
  if (argsLength > 0) {
    const argsExpansion = state.expandMemory(argsOffset, argsLength)
    if (argsExpansion > 0n) {
      state.chargeGas(argsExpansion)
    }
  }
  if (retLength > 0) {
    const retExpansion = state.expandMemory(retOffset, retLength)
    if (retExpansion > 0n) {
      state.chargeGas(retExpansion)
    }
  }

  // Read input data from memory
  const input = argsLength > 0 ? state.readMemory(argsOffset, argsLength) : new Uint8Array(0)

  // Calculate gas to forward
  const gasToForward = calculateCallGas(state.gasRemaining, requestedGas)

  // Check call depth (max 1024)
  if (depth >= 1024) {
    // Call fails due to depth limit
    state.returnData = new Uint8Array(0)
    stack.push(Word256.zero())
    const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, Word256.zero())
    trace.record(pushEvent)
    state.pc += 1
    return
  }

  // Execute the call
  const callParams: CallParams = {
    kind: CallKind.CALL,
    gas: gasToForward,
    to,
    value,
    input,
    caller: currentAddress,
    depth: depth + 1,
  }

  const result = host.call(callParams)

  // Deduct gas used
  state.gasRemaining -= result.gasUsed

  // Store return data
  state.returnData = result.returnData

  // Copy return data to memory (up to retLength)
  if (retLength > 0 && result.returnData.length > 0) {
    const copyLength = Math.min(retLength, result.returnData.length)
    state.writeMemory(retOffset, result.returnData.slice(0, copyLength))
  }

  // Push success (1) or failure (0)
  const successWord = result.success ? Word256.one() : Word256.zero()
  stack.push(successWord)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, successWord)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * STATICCALL (0xfa)
 * Static call to another contract (no state modifications allowed)
 * Gas: Similar to CALL but no value transfer
 *
 * Stack: [retLength, retOffset, argsLength, argsOffset, to, gas] -> [success]
 * (gas is on top, no value parameter)
 */
export function executeSTATICCALL(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host,
  currentAddress: Address,
  depth: number
): void {
  // Pop arguments (gas on top)
  const gasWord = stack.pop()
  const popGas = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, gasWord)
  trace.record(popGas)

  const toWord = stack.pop()
  const popTo = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, toWord)
  trace.record(popTo)

  const argsOffsetWord = stack.pop()
  const popArgsOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsOffsetWord)
  trace.record(popArgsOffset)

  const argsLengthWord = stack.pop()
  const popArgsLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsLengthWord)
  trace.record(popArgsLength)

  const retOffsetWord = stack.pop()
  const popRetOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retOffsetWord)
  trace.record(popRetOffset)

  const retLengthWord = stack.pop()
  const popRetLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retLengthWord)
  trace.record(popRetLength)

  const requestedGas = gasWord.value
  const to = Address.fromWord256(toWord)
  const argsOffset = Number(argsOffsetWord.value)
  const argsLength = Number(argsLengthWord.value)
  const retOffset = Number(retOffsetWord.value)
  const retLength = Number(retLengthWord.value)

  // Base gas cost
  const gasCost = 100n // Warm access (simplified)

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'STATICCALL'
  )
  trace.record(gasEvent)

  // Expand memory for args and return data
  if (argsLength > 0) {
    const argsExpansion = state.expandMemory(argsOffset, argsLength)
    if (argsExpansion > 0n) {
      state.chargeGas(argsExpansion)
    }
  }
  if (retLength > 0) {
    const retExpansion = state.expandMemory(retOffset, retLength)
    if (retExpansion > 0n) {
      state.chargeGas(retExpansion)
    }
  }

  // Read input data from memory
  const input = argsLength > 0 ? state.readMemory(argsOffset, argsLength) : new Uint8Array(0)

  // Calculate gas to forward
  const gasToForward = calculateCallGas(state.gasRemaining, requestedGas)

  // Check call depth
  if (depth >= 1024) {
    state.returnData = new Uint8Array(0)
    stack.push(Word256.zero())
    const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, Word256.zero())
    trace.record(pushEvent)
    state.pc += 1
    return
  }

  // Execute the static call
  const callParams: CallParams = {
    kind: CallKind.STATICCALL,
    gas: gasToForward,
    to,
    value: 0n, // No value in staticcall
    input,
    caller: currentAddress,
    depth: depth + 1,
  }

  const result = host.call(callParams)

  // Deduct gas used
  state.gasRemaining -= result.gasUsed

  // Store return data
  state.returnData = result.returnData

  // Copy return data to memory
  if (retLength > 0 && result.returnData.length > 0) {
    const copyLength = Math.min(retLength, result.returnData.length)
    state.writeMemory(retOffset, result.returnData.slice(0, copyLength))
  }

  // Push success (1) or failure (0)
  const successWord = result.success ? Word256.one() : Word256.zero()
  stack.push(successWord)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, successWord)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * DELEGATECALL (0xf4)
 * Call another contract using caller's storage and context
 * Gas: Similar to STATICCALL
 *
 * Stack: [retLength, retOffset, argsLength, argsOffset, to, gas] -> [success]
 * (gas is on top, no value parameter - uses caller's value)
 */
export function executeDELEGATECALL(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host,
  _currentAddress: Address, // Not used directly - context is preserved by call kind
  depth: number,
  currentValue: bigint
): void {
  // Pop arguments (gas on top)
  const gasWord = stack.pop()
  const popGas = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, gasWord)
  trace.record(popGas)

  const toWord = stack.pop()
  const popTo = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, toWord)
  trace.record(popTo)

  const argsOffsetWord = stack.pop()
  const popArgsOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsOffsetWord)
  trace.record(popArgsOffset)

  const argsLengthWord = stack.pop()
  const popArgsLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsLengthWord)
  trace.record(popArgsLength)

  const retOffsetWord = stack.pop()
  const popRetOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retOffsetWord)
  trace.record(popRetOffset)

  const retLengthWord = stack.pop()
  const popRetLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retLengthWord)
  trace.record(popRetLength)

  const requestedGas = gasWord.value
  const to = Address.fromWord256(toWord)
  const argsOffset = Number(argsOffsetWord.value)
  const argsLength = Number(argsLengthWord.value)
  const retOffset = Number(retOffsetWord.value)
  const retLength = Number(retLengthWord.value)

  // Base gas cost
  const gasCost = 100n // Warm access (simplified)

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'DELEGATECALL'
  )
  trace.record(gasEvent)

  // Expand memory for args and return data
  if (argsLength > 0) {
    const argsExpansion = state.expandMemory(argsOffset, argsLength)
    if (argsExpansion > 0n) {
      state.chargeGas(argsExpansion)
    }
  }
  if (retLength > 0) {
    const retExpansion = state.expandMemory(retOffset, retLength)
    if (retExpansion > 0n) {
      state.chargeGas(retExpansion)
    }
  }

  // Read input data from memory
  const input = argsLength > 0 ? state.readMemory(argsOffset, argsLength) : new Uint8Array(0)

  // Calculate gas to forward
  const gasToForward = calculateCallGas(state.gasRemaining, requestedGas)

  // Check call depth
  if (depth >= 1024) {
    state.returnData = new Uint8Array(0)
    stack.push(Word256.zero())
    const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, Word256.zero())
    trace.record(pushEvent)
    state.pc += 1
    return
  }

  // Execute the delegate call
  // Note: In delegatecall, msg.sender and msg.value are preserved from the caller
  const callParams: CallParams = {
    kind: CallKind.DELEGATECALL,
    gas: gasToForward,
    to,
    value: currentValue, // Preserve caller's value
    input,
    caller: host.getCaller(), // Preserve original caller
    depth: depth + 1,
  }

  const result = host.call(callParams)

  // Deduct gas used
  state.gasRemaining -= result.gasUsed

  // Store return data
  state.returnData = result.returnData

  // Copy return data to memory
  if (retLength > 0 && result.returnData.length > 0) {
    const copyLength = Math.min(retLength, result.returnData.length)
    state.writeMemory(retOffset, result.returnData.slice(0, copyLength))
  }

  // Push success (1) or failure (0)
  const successWord = result.success ? Word256.one() : Word256.zero()
  stack.push(successWord)
  const pushEvent = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, successWord)
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * CALLCODE (0xf2)
 * Call another contract's code in the caller's context
 * Deprecated, but still supported for compatibility
 * Gas: Similar to CALL
 *
 * Stack: [retLength, retOffset, argsLength, argsOffset, value, to, gas] -> [success]
 */
export function executeCALLCODE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host,
  currentAddress: Address,
  depth: number
): void {
  // Pop arguments (gas on top)
  const gasWord = stack.pop()
  const popGas = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, gasWord)
  trace.record(popGas)

  const toWord = stack.pop()
  const popTo = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, toWord)
  trace.record(popTo)

  const valueWord = stack.pop()
  const popValue = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, valueWord)
  trace.record(popValue)

  const argsOffsetWord = stack.pop()
  const popArgsOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsOffsetWord)
  trace.record(popArgsOffset)

  const argsLengthWord = stack.pop()
  const popArgsLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, argsLengthWord)
  trace.record(popArgsLength)

  const retOffsetWord = stack.pop()
  const popRetOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retOffsetWord)
  trace.record(popRetOffset)

  const retLengthWord = stack.pop()
  const popRetLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, retLengthWord)
  trace.record(popRetLength)

  const requestedGas = gasWord.value
  const to = Address.fromWord256(toWord)
  const value = valueWord.value
  const argsOffset = Number(argsOffsetWord.value)
  const argsLength = Number(argsLengthWord.value)
  const retOffset = Number(retOffsetWord.value)
  const retLength = Number(retLengthWord.value)

  // Base gas cost
  let gasCost = 100n // Warm access

  // Add value transfer cost
  if (value > 0n) {
    gasCost += 9000n
  }

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'CALLCODE'
  )
  trace.record(gasEvent)

  // Expand memory
  if (argsLength > 0) {
    const argsExpansion = state.expandMemory(argsOffset, argsLength)
    if (argsExpansion > 0n) {
      state.chargeGas(argsExpansion)
    }
  }
  if (retLength > 0) {
    const retExpansion = state.expandMemory(retOffset, retLength)
    if (retExpansion > 0n) {
      state.chargeGas(retExpansion)
    }
  }

  // Read input data
  const input = argsLength > 0 ? state.readMemory(argsOffset, argsLength) : new Uint8Array(0)

  // Calculate gas to forward
  const gasToForward = calculateCallGas(state.gasRemaining, requestedGas)

  // Check call depth
  if (depth >= 1024) {
    state.returnData = new Uint8Array(0)
    stack.push(Word256.zero())
    const pushEventDepth = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, Word256.zero())
    trace.record(pushEventDepth)
    state.pc += 1
    return
  }

  // Execute callcode - runs target code in caller's context
  const callParams: CallParams = {
    kind: CallKind.CALLCODE,
    gas: gasToForward,
    to,
    value,
    input,
    caller: currentAddress,
    depth: depth + 1,
  }

  const resultCallcode = host.call(callParams)

  state.gasRemaining -= resultCallcode.gasUsed
  state.returnData = resultCallcode.returnData

  if (retLength > 0 && resultCallcode.returnData.length > 0) {
    const copyLength = Math.min(retLength, resultCallcode.returnData.length)
    state.writeMemory(retOffset, resultCallcode.returnData.slice(0, copyLength))
  }

  const successWordCallcode = resultCallcode.success ? Word256.one() : Word256.zero()
  stack.push(successWordCallcode)
  const pushEventCallcode = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, successWordCallcode)
  trace.record(pushEventCallcode)

  state.pc += 1
}

/**
 * CREATE (0xf0)
 * Create a new contract
 * Gas: 32000 + memory expansion + execution
 *
 * Stack: [length, offset, value] -> [address]
 * (value is on top)
 */
export function executeCREATE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host,
  currentAddress: Address,
  depth: number
): void {
  // Pop arguments
  const valueWord = stack.pop()
  const popValue = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, valueWord)
  trace.record(popValue)

  const offsetWord = stack.pop()
  const popOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, offsetWord)
  trace.record(popOffset)

  const lengthWord = stack.pop()
  const popLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, lengthWord)
  trace.record(popLength)

  const value = valueWord.value
  const offset = Number(offsetWord.value)
  const length = Number(lengthWord.value)

  // Base gas cost
  const gasCost = 32000n

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'CREATE'
  )
  trace.record(gasEvent)

  // Expand memory
  if (length > 0) {
    const expansion = state.expandMemory(offset, length)
    if (expansion > 0n) {
      state.chargeGas(expansion)
    }
  }

  // Read init code from memory
  const initCode = length > 0 ? state.readMemory(offset, length) : new Uint8Array(0)

  // Check call depth
  if (depth >= 1024) {
    stack.push(Word256.zero())
    const pushEventDepth = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, Word256.zero())
    trace.record(pushEventDepth)
    state.pc += 1
    return
  }

  // Calculate gas to forward (63/64 rule)
  const gasToForward = calculateCallGas(state.gasRemaining, state.gasRemaining)

  // Execute create
  const createParams: CreateParams = {
    caller: currentAddress,
    value,
    initCode,
    gas: gasToForward,
    depth: depth + 1,
  }

  const resultCreate = host.create(createParams)

  state.gasRemaining -= resultCreate.gasUsed
  state.returnData = resultCreate.returnData

  // Push created address or zero on failure
  const resultWord = resultCreate.success ? Word256.from(resultCreate.address.value) : Word256.zero()
  stack.push(resultWord)
  const pushEventCreate = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, resultWord)
  trace.record(pushEventCreate)

  state.pc += 1
}

/**
 * CREATE2 (0xf5)
 * Create a new contract with deterministic address
 * Gas: 32000 + 6 * ceil(len(initCode) / 32) + memory expansion
 *
 * Stack: [salt, length, offset, value] -> [address]
 * (value is on top)
 */
export function executeCREATE2(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host,
  currentAddress: Address,
  depth: number
): void {
  // Pop arguments
  const valueWord = stack.pop()
  const popValue = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, valueWord)
  trace.record(popValue)

  const offsetWord = stack.pop()
  const popOffset = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, offsetWord)
  trace.record(popOffset)

  const lengthWord = stack.pop()
  const popLength = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, lengthWord)
  trace.record(popLength)

  const saltWord = stack.pop()
  const popSalt = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, saltWord)
  trace.record(popSalt)

  const value = valueWord.value
  const offset = Number(offsetWord.value)
  const length = Number(lengthWord.value)

  // Base gas cost + hashing cost
  const wordCount = length === 0 ? 0n : BigInt(Math.ceil(length / 32))
  const gasCost = 32000n + 6n * wordCount

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'CREATE2'
  )
  trace.record(gasEvent)

  // Expand memory
  if (length > 0) {
    const expansion = state.expandMemory(offset, length)
    if (expansion > 0n) {
      state.chargeGas(expansion)
    }
  }

  // Read init code from memory
  const initCode = length > 0 ? state.readMemory(offset, length) : new Uint8Array(0)

  // Check call depth
  if (depth >= 1024) {
    stack.push(Word256.zero())
    const pushEventDepth = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, Word256.zero())
    trace.record(pushEventDepth)
    state.pc += 1
    return
  }

  // Calculate gas to forward
  const gasToForward = calculateCallGas(state.gasRemaining, state.gasRemaining)

  // Execute create2
  const createParams: CreateParams = {
    caller: currentAddress,
    value,
    initCode,
    gas: gasToForward,
    salt: saltWord, // Pass salt for CREATE2 address computation
    depth: depth + 1,
  }

  const resultCreate2 = host.create(createParams)

  state.gasRemaining -= resultCreate2.gasUsed
  state.returnData = resultCreate2.returnData

  // Push created address or zero on failure
  const resultWord = resultCreate2.success ? Word256.from(resultCreate2.address.value) : Word256.zero()
  stack.push(resultWord)
  const pushEventCreate2 = TraceEventBuilder.stackPush(trace.getNextIndex(), state.pc, state.gasRemaining, resultWord)
  trace.record(pushEventCreate2)

  state.pc += 1
}

/**
 * SELFDESTRUCT (0xff)
 * Destroy contract and send balance to recipient
 * Gas: 5000 (+ 25000 if creating new account)
 *
 * Stack: [recipient] -> []
 */
export function executeSELFDESTRUCT(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host,
  currentAddress: Address
): void {
  // Pop recipient address
  const recipientWord = stack.pop()
  const popEvent = TraceEventBuilder.stackPop(trace.getNextIndex(), state.pc, state.gasRemaining, recipientWord)
  trace.record(popEvent)

  const recipient = Address.fromWord256(recipientWord)

  // Gas cost (simplified - not checking for new account creation)
  const gasCost = 5000n

  state.chargeGas(gasCost)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'SELFDESTRUCT'
  )
  trace.record(gasEvent)

  // Execute selfdestruct
  host.selfdestruct(currentAddress, recipient)

  // Halt execution
  state.halt(HaltReason.SELFDESTRUCT)
}
