import { Word256 } from '../types/Word256'
import { HaltReason } from './HaltReason'

/**
 * MachineState - The complete state of the EVM at a given point in execution
 *
 * This represents everything needed to continue execution or restore to this point.
 */

export class MachineState {
  /** Program counter (index into bytecode) */
  pc: number

  /** Gas remaining */
  gasRemaining: bigint

  /** The EVM stack (max 1024 items) */
  stack: Word256[]

  /** Memory (expandable byte array) */
  memory: Uint8Array

  /** Return data from last call or execution */
  returnData: Uint8Array

  /** Whether execution has halted */
  halted: boolean

  /** Reason for halting (if halted) */
  haltReason?: HaltReason

  constructor(initialGas: bigint) {
    this.pc = 0
    this.gasRemaining = initialGas
    this.stack = []
    this.memory = new Uint8Array(0)
    this.returnData = new Uint8Array(0)
    this.halted = false
  }

  /**
   * Create a deep clone of this state (for snapshots)
   */
  clone(): MachineState {
    const cloned = new MachineState(this.gasRemaining)
    cloned.pc = this.pc
    cloned.gasRemaining = this.gasRemaining
    cloned.stack = [...this.stack]
    cloned.memory = new Uint8Array(this.memory)
    cloned.returnData = new Uint8Array(this.returnData)
    cloned.halted = this.halted
    cloned.haltReason = this.haltReason
    return cloned
  }

  /**
   * Halt execution with a reason
   */
  halt(reason: HaltReason): void {
    this.halted = true
    this.haltReason = reason
  }

  /**
   * Charge gas (throws if insufficient)
   */
  chargeGas(amount: bigint): void {
    if (this.gasRemaining < amount) {
      this.halt(HaltReason.OUT_OF_GAS)
      throw new Error('Out of gas')
    }
    this.gasRemaining -= amount
  }

  /**
   * Get current stack depth
   */
  getStackDepth(): number {
    return this.stack.length
  }

  /**
   * Check if stack has at least n items
   */
  hasStackItems(n: number): boolean {
    return this.stack.length >= n
  }

  /**
   * Expand memory if necessary
   * Returns the gas cost for expansion
   */
  expandMemory(offset: number, length: number): bigint {
    if (length === 0) {
      return 0n
    }

    const requiredSize = offset + length
    const currentSize = this.memory.length

    if (requiredSize <= currentSize) {
      return 0n // No expansion needed
    }

    // Calculate new size (round up to next 32-byte word)
    const newSize = Math.ceil(requiredSize / 32) * 32

    // Calculate gas cost (quadratic formula from Yellow Paper)
    const currentWords = Math.floor(currentSize / 32)
    const newWords = Math.floor(newSize / 32)

    const currentCost = BigInt(currentWords) * 3n + (BigInt(currentWords) ** 2n) / 512n
    const newCost = BigInt(newWords) * 3n + (BigInt(newWords) ** 2n) / 512n
    const expansionCost = newCost - currentCost

    // Expand memory
    const newMemory = new Uint8Array(newSize)
    newMemory.set(this.memory)
    this.memory = newMemory

    return expansionCost
  }

  /**
   * Read bytes from memory
   */
  readMemory(offset: number, length: number): Uint8Array {
    if (length === 0) {
      return new Uint8Array(0)
    }
    // Expand if necessary (though in practice this should be done before reading)
    if (offset + length > this.memory.length) {
      this.expandMemory(offset, length)
    }
    return this.memory.slice(offset, offset + length)
  }

  /**
   * Write bytes to memory
   */
  writeMemory(offset: number, data: Uint8Array): void {
    if (data.length === 0) {
      return
    }
    // Expand if necessary
    if (offset + data.length > this.memory.length) {
      this.expandMemory(offset, data.length)
    }
    this.memory.set(data, offset)
  }

  /**
   * Get memory size in bytes
   */
  getMemorySize(): number {
    return this.memory.length
  }
}
