/**
 * Storage Opcodes (Phase 4)
 *
 * These opcodes interact with persistent contract storage via the Host interface.
 *
 * Storage is:
 * - Persistent across transactions
 * - Sparse (non-set keys return zero)
 * - Expensive (gas costs not yet fully implemented)
 * - Addressed by 256-bit keys
 *
 * Opcodes:
 * - SLOAD (0x54): Load word from storage
 * - SSTORE (0x55): Store word to storage
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Host } from '../host/Host'

/**
 * SLOAD (0x54)
 * Load word from storage
 *
 * Stack:
 *   IN: [key]
 *   OUT: [value]
 *
 * Gas: 200 (warm) or 2100 (cold) - simplified to 200 for now
 *
 * Loads a 256-bit value from persistent storage at the given key.
 * Returns zero if the key has never been written to.
 */
export function executeSLOAD(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Simplified gas cost (warm access)
  state.chargeGas(200n)

  const key = stack.pop()
  const address = host.getAddress()
  const value = host.sload(address, key)

  // Emit storage read trace event
  const event = TraceEventBuilder.storageRead(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    address,
    key,
    value
  )
  trace.record(event)

  stack.push(value)
  state.pc += 1
}

/**
 * SSTORE (0x55)
 * Store word to storage
 *
 * Stack:
 *   IN: [key, value]
 *   OUT: []
 *
 * Gas: Complex (depends on current and new values) - simplified for now
 *
 * Stores a 256-bit value to persistent storage at the given key.
 * Storing zero effectively deletes the slot (storage is sparse).
 *
 * Gas semantics (simplified):
 * - Setting from zero to non-zero: 20000 gas
 * - Setting from non-zero to non-zero: 5000 gas
 * - Setting to zero (deletion): 5000 gas with refund
 *
 * Full gas semantics require tracking:
 * - Original value (at transaction start)
 * - Current value
 * - Whether slot was accessed before
 */
export function executeSSTORE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  const key = stack.pop()
  const value = stack.pop()
  const address = host.getAddress()

  // Get current value to determine gas cost
  const currentValue = host.sload(address, key)

  // Simplified gas calculation
  let gasCost = 5000n
  if (currentValue.isZero() && !value.isZero()) {
    // Setting from zero to non-zero (storage allocation)
    gasCost = 20000n
  }

  state.chargeGas(gasCost)

  // Emit storage write trace event
  const event = TraceEventBuilder.storageWrite(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    address,
    key,
    value
  )
  trace.record(event)

  // Perform the storage write
  host.sstore(address, key, value)

  state.pc += 1
}
