/**
 * Logging Opcodes (Phase 4)
 *
 * These opcodes emit log entries (events) via the Host interface.
 *
 * Logs are:
 * - Append-only
 * - Not accessible from within the EVM
 * - Used for external event notifications
 * - Indexed by topics for efficient filtering
 *
 * Opcodes:
 * - LOG0 (0xa0): Emit log with 0 topics
 * - LOG1 (0xa1): Emit log with 1 topic
 * - LOG2 (0xa2): Emit log with 2 topics
 * - LOG3 (0xa3): Emit log with 3 topics
 * - LOG4 (0xa4): Emit log with 4 topics
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Host } from '../host/Host'
import { Word256 } from '../types/Word256'

/**
 * LOG0 (0xa0)
 * Emit log entry with 0 topics
 *
 * Stack:
 *   IN: [offset, length]
 *   OUT: []
 *
 * Gas: 375 + 8*length + memory expansion
 *
 * Emits a log entry with data from memory but no topics.
 * Topics are used for indexing and filtering logs.
 */
export function executeLOG0(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  const offset = Number(stack.pop().value)
  const length = Number(stack.pop().value)

  // Base gas cost
  let gasCost = 375n
  // Per-byte cost
  gasCost += 8n * BigInt(length)

  // Memory expansion
  const expansionCost = state.expandMemory(offset, length)
  gasCost += expansionCost

  state.chargeGas(gasCost)

  // Read data from memory
  const data = state.readMemory(offset, length)

  // Emit log
  const address = host.getAddress()
  const topics: Word256[] = []

  host.log({ address, topics, data })

  // Emit trace event
  const event = TraceEventBuilder.log(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    address,
    topics,
    data
  )
  trace.record(event)

  state.pc += 1
}

/**
 * LOG1 (0xa1)
 * Emit log entry with 1 topic
 *
 * Stack:
 *   IN: [offset, length, topic0]
 *   OUT: []
 *
 * Gas: 375 + 375 + 8*length + memory expansion
 */
export function executeLOG1(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  const offset = Number(stack.pop().value)
  const length = Number(stack.pop().value)
  const topic0 = stack.pop()

  // Base gas cost + per-topic cost
  let gasCost = 375n + 375n
  // Per-byte cost
  gasCost += 8n * BigInt(length)

  // Memory expansion
  const expansionCost = state.expandMemory(offset, length)
  gasCost += expansionCost

  state.chargeGas(gasCost)

  // Read data from memory
  const data = state.readMemory(offset, length)

  // Emit log
  const address = host.getAddress()
  const topics: Word256[] = [topic0]

  host.log({ address, topics, data })

  // Emit trace event
  const event = TraceEventBuilder.log(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    address,
    topics,
    data
  )
  trace.record(event)

  state.pc += 1
}

/**
 * LOG2 (0xa2)
 * Emit log entry with 2 topics
 *
 * Stack:
 *   IN: [offset, length, topic0, topic1]
 *   OUT: []
 *
 * Gas: 375 + 2*375 + 8*length + memory expansion
 */
export function executeLOG2(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  const offset = Number(stack.pop().value)
  const length = Number(stack.pop().value)
  const topic0 = stack.pop()
  const topic1 = stack.pop()

  // Base gas cost + per-topic cost
  let gasCost = 375n + 2n * 375n
  // Per-byte cost
  gasCost += 8n * BigInt(length)

  // Memory expansion
  const expansionCost = state.expandMemory(offset, length)
  gasCost += expansionCost

  state.chargeGas(gasCost)

  // Read data from memory
  const data = state.readMemory(offset, length)

  // Emit log
  const address = host.getAddress()
  const topics: Word256[] = [topic0, topic1]

  host.log({ address, topics, data })

  // Emit trace event
  const event = TraceEventBuilder.log(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    address,
    topics,
    data
  )
  trace.record(event)

  state.pc += 1
}

/**
 * LOG3 (0xa3)
 * Emit log entry with 3 topics
 *
 * Stack:
 *   IN: [offset, length, topic0, topic1, topic2]
 *   OUT: []
 *
 * Gas: 375 + 3*375 + 8*length + memory expansion
 */
export function executeLOG3(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  const offset = Number(stack.pop().value)
  const length = Number(stack.pop().value)
  const topic0 = stack.pop()
  const topic1 = stack.pop()
  const topic2 = stack.pop()

  // Base gas cost + per-topic cost
  let gasCost = 375n + 3n * 375n
  // Per-byte cost
  gasCost += 8n * BigInt(length)

  // Memory expansion
  const expansionCost = state.expandMemory(offset, length)
  gasCost += expansionCost

  state.chargeGas(gasCost)

  // Read data from memory
  const data = state.readMemory(offset, length)

  // Emit log
  const address = host.getAddress()
  const topics: Word256[] = [topic0, topic1, topic2]

  host.log({ address, topics, data })

  // Emit trace event
  const event = TraceEventBuilder.log(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    address,
    topics,
    data
  )
  trace.record(event)

  state.pc += 1
}

/**
 * LOG4 (0xa4)
 * Emit log entry with 4 topics
 *
 * Stack:
 *   IN: [offset, length, topic0, topic1, topic2, topic3]
 *   OUT: []
 *
 * Gas: 375 + 4*375 + 8*length + memory expansion
 *
 * This is the maximum number of topics allowed in a log entry.
 */
export function executeLOG4(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  const offset = Number(stack.pop().value)
  const length = Number(stack.pop().value)
  const topic0 = stack.pop()
  const topic1 = stack.pop()
  const topic2 = stack.pop()
  const topic3 = stack.pop()

  // Base gas cost + per-topic cost
  let gasCost = 375n + 4n * 375n
  // Per-byte cost
  gasCost += 8n * BigInt(length)

  // Memory expansion
  const expansionCost = state.expandMemory(offset, length)
  gasCost += expansionCost

  state.chargeGas(gasCost)

  // Read data from memory
  const data = state.readMemory(offset, length)

  // Emit log
  const address = host.getAddress()
  const topics: Word256[] = [topic0, topic1, topic2, topic3]

  host.log({ address, topics, data })

  // Emit trace event
  const event = TraceEventBuilder.log(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    address,
    topics,
    data
  )
  trace.record(event)

  state.pc += 1
}
