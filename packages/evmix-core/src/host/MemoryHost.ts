/**
 * MemoryHost - Simple in-memory implementation of Host
 *
 * Stores everything in memory using Maps.
 * Suitable for testing and single-transaction execution.
 */

import { Word256 } from '../types/Word256'
import { Address } from '../types/Address'
import { Host, LogEntry } from './Host'

/**
 * Simple in-memory host implementation
 */
export class MemoryHost implements Host {
  private storage: Map<string, Word256>
  private logs: LogEntry[]
  private address: Address

  constructor(address?: Address) {
    this.storage = new Map()
    this.logs = []
    this.address = address || Address.zero()
  }

  /**
   * Load from storage
   * Storage key format: "address:key"
   */
  sload(address: Address, key: Word256): Word256 {
    const storageKey = `${address.toHex()}:${key.toHex()}`
    return this.storage.get(storageKey) || Word256.zero()
  }

  /**
   * Store to storage
   */
  sstore(address: Address, key: Word256, value: Word256): void {
    const storageKey = `${address.toHex()}:${key.toHex()}`
    if (value.isZero()) {
      // Delete if storing zero (storage is sparse)
      this.storage.delete(storageKey)
    } else {
      this.storage.set(storageKey, value)
    }
  }

  /**
   * Emit a log
   */
  log(entry: LogEntry): void {
    this.logs.push(entry)
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Get current address
   */
  getAddress(): Address {
    return this.address
  }

  /**
   * Set the executing contract address
   */
  setAddress(address: Address): void {
    this.address = address
  }

  /**
   * Clear all storage (for testing)
   */
  clearStorage(): void {
    this.storage.clear()
  }

  /**
   * Clear all logs (for testing)
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Get storage size (for debugging)
   */
  getStorageSize(): number {
    return this.storage.size
  }

  /**
   * Get all storage entries (for debugging)
   */
  getAllStorage(): Map<string, Word256> {
    return new Map(this.storage)
  }
}
