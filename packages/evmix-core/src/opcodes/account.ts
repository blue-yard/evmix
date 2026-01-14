/**
 * Account Opcodes (Phase 4)
 *
 * These opcodes access account balance information via the Host interface.
 *
 * Balance is:
 * - Measured in wei (smallest unit of Ether)
 * - Retrieved from the world state via the Host
 * - Returned as a 256-bit word (fits in a single stack slot)
 *
 * Opcodes:
 * - BALANCE (0x31): Get balance of any address
 * - SELFBALANCE (0x47): Get balance of current contract
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'
import { Address } from '../types/Address'
import { Host } from '../host/Host'

/**
 * BALANCE (0x31)
 * Get balance of any address
 *
 * Stack:
 *   IN: [address]
 *   OUT: [balance]
 *
 * Gas: 100 (warm) or 2600 (cold) - simplified to 100 for now
 *
 * Retrieves the balance in wei of the specified address.
 * The address is popped from the stack as a 256-bit word,
 * but only the lower 160 bits are used (addresses are 20 bytes).
 *
 * Returns 0 for non-existent accounts (accounts with no balance, code, or storage).
 */
export function executeBALANCE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Simplified gas cost (warm access)
  const gasCost = 100n
  state.chargeGas(gasCost)

  // Emit gas charge trace event
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'BALANCE'
  )
  trace.record(gasEvent)

  // Pop address from stack (256-bit word, only lower 160 bits used)
  const addressWord = stack.pop()

  // Emit stack pop trace event
  const popEvent = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    addressWord
  )
  trace.record(popEvent)

  // Convert Word256 to Address (takes lower 160 bits)
  const address = Address.from(addressWord.value)

  // Get balance from host
  const balance = host.getBalance(address)

  // Convert balance to Word256 for stack
  const balanceWord = Word256.from(balance)

  // Push balance onto stack
  stack.push(balanceWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    balanceWord
  )
  trace.record(pushEvent)

  // Advance program counter
  state.pc += 1
}

/**
 * SELFBALANCE (0x47)
 * Get balance of current contract
 *
 * Stack:
 *   IN: []
 *   OUT: [balance]
 *
 * Gas: 5
 *
 * Retrieves the balance in wei of the currently executing contract.
 * This is equivalent to BALANCE(ADDRESS) but cheaper because we already
 * know the current contract's address without needing to access the
 * warm/cold account access list.
 *
 * Introduced in Istanbul hard fork (EIP-1884).
 */
export function executeSELFBALANCE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost for SELFBALANCE is fixed at 5
  const gasCost = 5n
  state.chargeGas(gasCost)

  // Emit gas charge trace event
  const gasEvent = TraceEventBuilder.gasCharge(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasCost,
    'SELFBALANCE'
  )
  trace.record(gasEvent)

  // Get current contract address from host
  const address = host.getAddress()

  // Get balance from host
  const balance = host.getBalance(address)

  // Convert balance to Word256 for stack
  const balanceWord = Word256.from(balance)

  // Push balance onto stack
  stack.push(balanceWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    balanceWord
  )
  trace.record(pushEvent)

  // Advance program counter
  state.pc += 1
}
