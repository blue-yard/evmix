/**
 * Environment Opcodes
 *
 * These opcodes provide access to execution context information via the Host interface.
 *
 * Environment information includes:
 * - Contract address (ADDRESS)
 * - Transaction origin (ORIGIN)
 * - Message caller (CALLER)
 * - Call value (CALLVALUE)
 * - Gas price (GASPRICE)
 * - Remaining gas (GAS)
 *
 * All these opcodes push a single value onto the stack and cost 2 gas.
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'
import { Host } from '../host/Host'

/**
 * ADDRESS (0x30)
 * Push the current contract address onto the stack
 *
 * Stack:
 *   IN: []
 *   OUT: [address]
 *
 * Gas: 2
 *
 * Returns the address of the currently executing contract.
 * This is the contract that owns the code being executed.
 */
export function executeADDRESS(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'ADDRESS'
  )
  trace.record(gasEvent)

  // Get address from host and convert to Word256
  const address = host.getAddress()
  const result = Word256.from(address.value)

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
 * ORIGIN (0x32)
 * Push the transaction origin address onto the stack
 *
 * Stack:
 *   IN: []
 *   OUT: [origin]
 *
 * Gas: 2
 *
 * Returns the address that originated the transaction (tx.origin).
 * This is always an EOA (externally owned account), never a contract.
 *
 * Note: Using tx.origin for authorization is discouraged as it
 * makes contracts vulnerable to phishing attacks.
 */
export function executeORIGIN(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'ORIGIN'
  )
  trace.record(gasEvent)

  // Get origin from host and convert to Word256
  const origin = host.getOrigin()
  const result = Word256.from(origin.value)

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
 * CALLER (0x33)
 * Push the message caller address onto the stack
 *
 * Stack:
 *   IN: []
 *   OUT: [caller]
 *
 * Gas: 2
 *
 * Returns the address of the immediate caller (msg.sender).
 * This can be either an EOA or a contract.
 *
 * In a call chain A -> B -> C:
 * - When executing C, CALLER returns B's address
 * - When executing B, CALLER returns A's address
 */
export function executeCALLER(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'CALLER'
  )
  trace.record(gasEvent)

  // Get caller from host and convert to Word256
  const caller = host.getCaller()
  const result = Word256.from(caller.value)

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
 * CALLVALUE (0x34)
 * Push the message value in wei onto the stack
 *
 * Stack:
 *   IN: []
 *   OUT: [value]
 *
 * Gas: 2
 *
 * Returns the amount of wei sent with the current message (msg.value).
 * For a simple call without value transfer, this returns 0.
 */
export function executeCALLVALUE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'CALLVALUE'
  )
  trace.record(gasEvent)

  // Get call value from host
  const value = host.getCallValue()
  const result = Word256.from(value)

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
 * GASPRICE (0x3a)
 * Push the gas price onto the stack
 *
 * Stack:
 *   IN: []
 *   OUT: [gasPrice]
 *
 * Gas: 2
 *
 * Returns the gas price of the current transaction in wei.
 * Post-EIP-1559, this is the effective gas price (min of maxFeePerGas
 * and baseFee + maxPriorityFeePerGas).
 */
export function executeGASPRICE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Charge gas
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'GASPRICE'
  )
  trace.record(gasEvent)

  // Get gas price from host
  const gasPrice = host.getGasPrice()
  const result = Word256.from(gasPrice)

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
 * GAS (0x5a)
 * Push the remaining gas onto the stack
 *
 * Stack:
 *   IN: []
 *   OUT: [gas]
 *
 * Gas: 2
 *
 * Returns the amount of gas remaining after this instruction.
 * The gas cost of this opcode itself (2 gas) is charged BEFORE
 * the remaining gas is pushed, so the value on the stack reflects
 * the gas available for subsequent operations.
 *
 * Common use case: Passing gas to sub-calls while reserving some
 * for post-call operations.
 */
export function executeGAS(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector
): void {
  // Charge gas FIRST (important: this affects the value we push)
  state.chargeGas(2n)
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    2n,
    'GAS'
  )
  trace.record(gasEvent)

  // Get remaining gas AFTER charging (this is the value pushed to stack)
  const result = Word256.from(state.gasRemaining)

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
