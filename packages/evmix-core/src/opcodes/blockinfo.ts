/**
 * Block Information Opcodes
 *
 * These opcodes provide access to block context via the Host interface.
 *
 * Block information is:
 * - Read-only from the EVM's perspective
 * - Set by the environment before execution begins
 * - Used for time-based logic, randomness, and chain identification
 *
 * Opcodes:
 * - BLOCKHASH (0x40): Get hash of a recent block
 * - COINBASE (0x41): Get block coinbase address
 * - TIMESTAMP (0x42): Get block timestamp
 * - NUMBER (0x43): Get block number
 * - DIFFICULTY (0x44): Get block difficulty (or prevrandao post-merge)
 * - GASLIMIT (0x45): Get block gas limit
 * - CHAINID (0x46): Get chain ID
 * - BASEFEE (0x48): Get base fee per gas
 */

import { MachineState } from '../state/MachineState'
import { Stack } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Host } from '../host/Host'
import { Word256 } from '../types/Word256'

/**
 * BLOCKHASH (0x40)
 * Get hash of a recent block
 *
 * Stack:
 *   IN: [blockNumber]
 *   OUT: [hash]
 *
 * Gas: 20
 *
 * Returns the hash of the given block number if it is within the last 256 blocks.
 * Returns zero if the block number is out of range or is the current block.
 *
 * Common pitfalls:
 * - Only works for the last 256 blocks (not including current)
 * - Returns 0 for future blocks or blocks too old
 * - Not a reliable source of randomness (miners can manipulate)
 */
export function executeBLOCKHASH(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 20
  state.chargeGas(20n)

  // Pop block number from stack
  const blockNumber = stack.pop()

  // Emit stack pop trace event
  const popEvent = TraceEventBuilder.stackPop(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    blockNumber
  )
  trace.record(popEvent)

  // Get block hash from host
  const hash = host.getBlockHash(blockNumber.value)

  // Push result to stack
  stack.push(hash)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    hash
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * COINBASE (0x41)
 * Get block coinbase address
 *
 * Stack:
 *   IN: []
 *   OUT: [coinbase]
 *
 * Gas: 2
 *
 * Returns the beneficiary address of the current block.
 * Pre-merge: Miner address
 * Post-merge: Fee recipient address
 */
export function executeCOINBASE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 2
  state.chargeGas(2n)

  // Get coinbase from host
  const coinbase = host.getCoinbase()

  // Convert address to Word256 (left-pad to 32 bytes)
  const coinbaseWord = Word256.from(coinbase.value)

  // Push result to stack
  stack.push(coinbaseWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    coinbaseWord
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * TIMESTAMP (0x42)
 * Get block timestamp
 *
 * Stack:
 *   IN: []
 *   OUT: [timestamp]
 *
 * Gas: 2
 *
 * Returns the timestamp of the current block in seconds since Unix epoch.
 *
 * Common pitfalls:
 * - Miners/validators can manipulate timestamp within bounds
 * - Not suitable for high-precision timing
 * - Should not be used as sole source of randomness
 */
export function executeTIMESTAMP(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 2
  state.chargeGas(2n)

  // Get timestamp from host
  const timestamp = host.getTimestamp()

  // Convert to Word256
  const timestampWord = Word256.from(timestamp)

  // Push result to stack
  stack.push(timestampWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    timestampWord
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * NUMBER (0x43)
 * Get block number
 *
 * Stack:
 *   IN: []
 *   OUT: [number]
 *
 * Gas: 2
 *
 * Returns the number of the current block (block height).
 */
export function executeNUMBER(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 2
  state.chargeGas(2n)

  // Get block number from host
  const blockNumber = host.getBlockNumber()

  // Convert to Word256
  const blockNumberWord = Word256.from(blockNumber)

  // Push result to stack
  stack.push(blockNumberWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    blockNumberWord
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * DIFFICULTY (0x44)
 * Get block difficulty (or prevrandao post-merge)
 *
 * Stack:
 *   IN: []
 *   OUT: [difficulty]
 *
 * Gas: 2
 *
 * Pre-merge: Returns the difficulty of the current block.
 * Post-merge (EIP-4399): Returns the output of the beacon chain's RANDAO.
 *
 * The PREVRANDAO opcode (0x44) is the same as DIFFICULTY but semantically
 * different post-merge. The opcode number is unchanged for backward compatibility.
 */
export function executeDIFFICULTY(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 2
  state.chargeGas(2n)

  // Get difficulty from host
  const difficulty = host.getDifficulty()

  // Convert to Word256
  const difficultyWord = Word256.from(difficulty)

  // Push result to stack
  stack.push(difficultyWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    difficultyWord
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * GASLIMIT (0x45)
 * Get block gas limit
 *
 * Stack:
 *   IN: []
 *   OUT: [gasLimit]
 *
 * Gas: 2
 *
 * Returns the gas limit of the current block.
 * This is the maximum total gas that can be used by all transactions in the block.
 */
export function executeGASLIMIT(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 2
  state.chargeGas(2n)

  // Get gas limit from host
  const gasLimit = host.getGasLimit()

  // Convert to Word256
  const gasLimitWord = Word256.from(gasLimit)

  // Push result to stack
  stack.push(gasLimitWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    gasLimitWord
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * CHAINID (0x46)
 * Get chain ID
 *
 * Stack:
 *   IN: []
 *   OUT: [chainId]
 *
 * Gas: 2
 *
 * Returns the chain ID as defined in EIP-155.
 * Common chain IDs:
 * - 1: Ethereum Mainnet
 * - 5: Goerli
 * - 11155111: Sepolia
 *
 * Introduced in the Istanbul hard fork (EIP-1344).
 */
export function executeCHAINID(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 2
  state.chargeGas(2n)

  // Get chain ID from host
  const chainId = host.getChainId()

  // Convert to Word256
  const chainIdWord = Word256.from(chainId)

  // Push result to stack
  stack.push(chainIdWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    chainIdWord
  )
  trace.record(pushEvent)

  state.pc += 1
}

/**
 * BASEFEE (0x48)
 * Get base fee per gas
 *
 * Stack:
 *   IN: []
 *   OUT: [baseFee]
 *
 * Gas: 2
 *
 * Returns the base fee per gas of the current block as defined in EIP-1559.
 * The base fee is the minimum gas price that must be paid for a transaction
 * to be included in a block.
 *
 * Introduced in the London hard fork (EIP-3198).
 *
 * Note: Opcode 0x47 (SELFBALANCE) is not in this sequence.
 */
export function executeBASEFEE(
  state: MachineState,
  stack: Stack,
  trace: TraceCollector,
  host: Host
): void {
  // Gas cost: 2
  state.chargeGas(2n)

  // Get base fee from host
  const baseFee = host.getBaseFee()

  // Convert to Word256
  const baseFeeWord = Word256.from(baseFee)

  // Push result to stack
  stack.push(baseFeeWord)

  // Emit stack push trace event
  const pushEvent = TraceEventBuilder.stackPush(
    trace.getNextIndex(),
    state.pc,
    state.gasRemaining,
    baseFeeWord
  )
  trace.record(pushEvent)

  state.pc += 1
}
