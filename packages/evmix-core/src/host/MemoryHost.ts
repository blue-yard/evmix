/**
 * MemoryHost - Simple in-memory implementation of Host
 *
 * Stores everything in memory using Maps.
 * Suitable for testing and single-transaction execution.
 */

import { Word256 } from '../types/Word256'
import { Address } from '../types/Address'
import { Host, LogEntry, TxContext, MsgContext, BlockContext } from './Host'

/**
 * Configuration for MemoryHost
 */
export interface MemoryHostConfig {
  address?: Address
  txContext?: Partial<TxContext>
  msgContext?: Partial<MsgContext>
  blockContext?: Partial<BlockContext>
}

/**
 * Simple in-memory host implementation
 */
export class MemoryHost implements Host {
  private storage: Map<string, Word256>
  private logs: LogEntry[]
  private address: Address

  // Transaction context
  private origin: Address
  private gasPrice: bigint

  // Message context
  private caller: Address
  private callValue: bigint

  // Block context
  private coinbase: Address
  private timestamp: bigint
  private blockNumber: bigint
  private difficulty: bigint
  private gasLimit: bigint
  private chainId: bigint
  private baseFee: bigint
  private blockHashes: Map<string, Word256>

  // Account state
  private balances: Map<string, bigint>
  private codes: Map<string, Uint8Array>
  private codeHashes: Map<string, Word256>

  constructor(config?: MemoryHostConfig) {
    this.storage = new Map()
    this.logs = []
    this.blockHashes = new Map()
    this.balances = new Map()
    this.codes = new Map()
    this.codeHashes = new Map()

    // Set address
    this.address = config?.address || Address.zero()

    // Set transaction context with defaults
    this.origin = config?.txContext?.origin || Address.zero()
    this.gasPrice = config?.txContext?.gasPrice ?? 0n

    // Set message context with defaults
    this.caller = config?.msgContext?.caller || Address.zero()
    this.callValue = config?.msgContext?.value ?? 0n

    // Set block context with defaults
    this.coinbase = config?.blockContext?.coinbase || Address.zero()
    this.timestamp = config?.blockContext?.timestamp ?? BigInt(Math.floor(Date.now() / 1000))
    this.blockNumber = config?.blockContext?.number ?? 0n
    this.difficulty = config?.blockContext?.difficulty ?? 0n
    this.gasLimit = config?.blockContext?.gasLimit ?? 30_000_000n
    this.chainId = config?.blockContext?.chainId ?? 1n
    this.baseFee = config?.blockContext?.baseFee ?? 0n
  }

  // ==================== Storage ====================

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

  // ==================== Logging ====================

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

  // ==================== Execution Context ====================

  /**
   * Get current address
   */
  getAddress(): Address {
    return this.address
  }

  /**
   * Get transaction origin
   */
  getOrigin(): Address {
    return this.origin
  }

  /**
   * Get message caller
   */
  getCaller(): Address {
    return this.caller
  }

  /**
   * Get call value
   */
  getCallValue(): bigint {
    return this.callValue
  }

  /**
   * Get gas price
   */
  getGasPrice(): bigint {
    return this.gasPrice
  }

  // ==================== Block Context ====================

  /**
   * Get hash of a recent block
   * Returns zero if block number is out of range
   */
  getBlockHash(blockNumber: bigint): Word256 {
    // BLOCKHASH only works for the 256 most recent blocks (not including current)
    const current = this.blockNumber
    if (blockNumber >= current || blockNumber < current - 256n) {
      return Word256.zero()
    }
    return this.blockHashes.get(blockNumber.toString()) || Word256.zero()
  }

  /**
   * Get block coinbase
   */
  getCoinbase(): Address {
    return this.coinbase
  }

  /**
   * Get block timestamp
   */
  getTimestamp(): bigint {
    return this.timestamp
  }

  /**
   * Get block number
   */
  getBlockNumber(): bigint {
    return this.blockNumber
  }

  /**
   * Get block difficulty
   */
  getDifficulty(): bigint {
    return this.difficulty
  }

  /**
   * Get block gas limit
   */
  getGasLimit(): bigint {
    return this.gasLimit
  }

  /**
   * Get chain ID
   */
  getChainId(): bigint {
    return this.chainId
  }

  /**
   * Get base fee
   */
  getBaseFee(): bigint {
    return this.baseFee
  }

  // ==================== Account Access ====================

  /**
   * Get account balance
   */
  getBalance(address: Address): bigint {
    return this.balances.get(address.toHex()) ?? 0n
  }

  /**
   * Get account code
   */
  getCode(address: Address): Uint8Array {
    return this.codes.get(address.toHex()) || new Uint8Array(0)
  }

  /**
   * Get account code hash
   * Returns empty hash for accounts with no code
   */
  getCodeHash(address: Address): Word256 {
    // Check if we have a stored hash
    const stored = this.codeHashes.get(address.toHex())
    if (stored) {
      return stored
    }

    // Check if there's code
    const code = this.codes.get(address.toHex())
    if (!code || code.length === 0) {
      // Empty code hash (keccak256 of empty bytes)
      // 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
      return Word256.from(
        0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470n
      )
    }

    // For now, return a placeholder - real implementation would compute keccak256
    return Word256.zero()
  }

  // ==================== Test Helpers ====================

  /**
   * Set the executing contract address
   */
  setAddress(address: Address): void {
    this.address = address
  }

  /**
   * Set transaction origin
   */
  setOrigin(origin: Address): void {
    this.origin = origin
  }

  /**
   * Set message caller
   */
  setCaller(caller: Address): void {
    this.caller = caller
  }

  /**
   * Set call value
   */
  setCallValue(value: bigint): void {
    this.callValue = value
  }

  /**
   * Set gas price
   */
  setGasPrice(gasPrice: bigint): void {
    this.gasPrice = gasPrice
  }

  /**
   * Set block context
   */
  setBlockContext(context: Partial<BlockContext>): void {
    if (context.coinbase !== undefined) this.coinbase = context.coinbase
    if (context.timestamp !== undefined) this.timestamp = context.timestamp
    if (context.number !== undefined) this.blockNumber = context.number
    if (context.difficulty !== undefined) this.difficulty = context.difficulty
    if (context.gasLimit !== undefined) this.gasLimit = context.gasLimit
    if (context.chainId !== undefined) this.chainId = context.chainId
    if (context.baseFee !== undefined) this.baseFee = context.baseFee
  }

  /**
   * Set a block hash
   */
  setBlockHash(blockNumber: bigint, hash: Word256): void {
    this.blockHashes.set(blockNumber.toString(), hash)
  }

  /**
   * Set account balance
   */
  setBalance(address: Address, balance: bigint): void {
    this.balances.set(address.toHex(), balance)
  }

  /**
   * Set account code
   */
  setCode(address: Address, code: Uint8Array): void {
    this.codes.set(address.toHex(), code)
  }

  /**
   * Set account code hash
   */
  setCodeHash(address: Address, hash: Word256): void {
    this.codeHashes.set(address.toHex(), hash)
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
