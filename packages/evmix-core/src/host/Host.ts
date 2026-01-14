/**
 * Host - Interface between the EVM and the world
 *
 * The Host provides access to:
 * - Storage (persistent key-value store)
 * - Logs (event emissions)
 * - Transaction context (origin, caller, value, gas price)
 * - Block context (number, timestamp, coinbase, etc.)
 * - Account information (balance, code)
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
 * Transaction context - information about the current transaction
 */
export interface TxContext {
  origin: Address // Original transaction sender (tx.origin)
  gasPrice: bigint // Gas price in wei
}

/**
 * Message context - information about the current message call
 */
export interface MsgContext {
  caller: Address // Message sender (msg.sender)
  value: bigint // Wei sent with message (msg.value)
}

/**
 * Block context - information about the current block
 */
export interface BlockContext {
  coinbase: Address // Block miner/validator address
  timestamp: bigint // Block timestamp (seconds since epoch)
  number: bigint // Block number
  difficulty: bigint // Block difficulty (or prevrandao post-merge)
  gasLimit: bigint // Block gas limit
  chainId: bigint // Chain ID (EIP-155)
  baseFee: bigint // Base fee per gas (EIP-1559)
}

/**
 * Account information
 */
export interface Account {
  balance: bigint
  code: Uint8Array
  codeHash: Word256
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
  // ==================== Storage ====================

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

  // ==================== Logging ====================

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

  // ==================== Execution Context ====================

  /**
   * Get the current contract address (ADDRESS opcode)
   * @returns Address of the executing contract
   */
  getAddress(): Address

  /**
   * Get the transaction origin (ORIGIN opcode)
   * @returns Address that originated the transaction
   */
  getOrigin(): Address

  /**
   * Get the message caller (CALLER opcode)
   * @returns Address of the immediate caller
   */
  getCaller(): Address

  /**
   * Get the call value (CALLVALUE opcode)
   * @returns Wei sent with this call
   */
  getCallValue(): bigint

  /**
   * Get the gas price (GASPRICE opcode)
   * @returns Gas price in wei
   */
  getGasPrice(): bigint

  // ==================== Block Context ====================

  /**
   * Get hash of a recent block (BLOCKHASH opcode)
   * @param blockNumber Block number (must be within last 256 blocks)
   * @returns Block hash or zero if out of range
   */
  getBlockHash(blockNumber: bigint): Word256

  /**
   * Get block coinbase address (COINBASE opcode)
   * @returns Miner/validator address
   */
  getCoinbase(): Address

  /**
   * Get block timestamp (TIMESTAMP opcode)
   * @returns Timestamp in seconds since epoch
   */
  getTimestamp(): bigint

  /**
   * Get block number (NUMBER opcode)
   * @returns Current block number
   */
  getBlockNumber(): bigint

  /**
   * Get block difficulty/prevrandao (DIFFICULTY opcode)
   * @returns Difficulty (pre-merge) or prevrandao (post-merge)
   */
  getDifficulty(): bigint

  /**
   * Get block gas limit (GASLIMIT opcode)
   * @returns Block gas limit
   */
  getGasLimit(): bigint

  /**
   * Get chain ID (CHAINID opcode)
   * @returns Chain ID per EIP-155
   */
  getChainId(): bigint

  /**
   * Get base fee (BASEFEE opcode)
   * @returns Base fee per gas per EIP-1559
   */
  getBaseFee(): bigint

  // ==================== Account Access ====================

  /**
   * Get account balance (BALANCE opcode)
   * @param address Account address
   * @returns Balance in wei
   */
  getBalance(address: Address): bigint

  /**
   * Get account code (for EXTCODESIZE, EXTCODECOPY)
   * @param address Account address
   * @returns Contract bytecode (empty for EOAs)
   */
  getCode(address: Address): Uint8Array

  /**
   * Get account code hash (EXTCODEHASH opcode)
   * @param address Account address
   * @returns Keccak256 of code, or special values for EOAs/empty
   */
  getCodeHash(address: Address): Word256
}
