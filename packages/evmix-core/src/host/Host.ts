/**
 * Host - Interface between the EVM and the world
 *
 * The Host provides access to:
 * - Storage (persistent key-value store)
 * - Logs (event emissions)
 * - Account information (Phase 4+)
 * - External calls (Phase 4+)
 */

import { Word256 } from '../types/Word256'
import { Address } from '../types/Address'

/**
 * Log entry emitted by LOG0-LOG4 opcodes
 */
export interface LogEntry {
  address: Address
  topics: Word256[]
  data: Uint8Array
}

/**
 * Host interface - provides world state access to the EVM
 *
 * This is the boundary between the EVM interpreter and the outside world.
 * Different implementations can provide different backends:
 * - In-memory (for testing)
 * - Database-backed (for real nodes)
 * - Mock (for unit tests)
 */
export interface Host {
  /**
   * Load a value from storage
   * @param address Contract address
   * @param key Storage key
   * @returns Value at that key (0 if not set)
   */
  sload(address: Address, key: Word256): Word256

  /**
   * Store a value to storage
   * @param address Contract address
   * @param key Storage key
   * @param value Value to store
   */
  sstore(address: Address, key: Word256, value: Word256): void

  /**
   * Emit a log entry
   * @param entry Log entry to emit
   */
  log(entry: LogEntry): void

  /**
   * Get all logs emitted so far
   * @returns Array of log entries
   */
  getLogs(): LogEntry[]

  /**
   * Get the current contract address
   * @returns Address of the executing contract
   */
  getAddress(): Address
}
