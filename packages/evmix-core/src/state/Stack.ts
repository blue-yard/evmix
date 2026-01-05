import { Word256 } from '../types/Word256'

/**
 * Stack - The EVM stack (LIFO)
 *
 * The EVM stack can hold up to 1024 256-bit words.
 * Operations that would exceed this limit result in stack overflow.
 */

export const MAX_STACK_DEPTH = 1024

export class StackError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StackError'
  }
}

export class Stack {
  private items: Word256[]

  constructor() {
    this.items = []
  }

  /**
   * Push a value onto the stack
   * Throws StackError if stack would overflow
   */
  push(value: Word256): void {
    if (this.items.length >= MAX_STACK_DEPTH) {
      throw new StackError(`Stack overflow: cannot push beyond ${MAX_STACK_DEPTH} items`)
    }
    this.items.push(value)
  }

  /**
   * Pop a value from the stack
   * Throws StackError if stack is empty
   */
  pop(): Word256 {
    if (this.items.length === 0) {
      throw new StackError('Stack underflow: cannot pop from empty stack')
    }
    return this.items.pop()!
  }

  /**
   * Peek at the top value without removing it
   * Throws StackError if stack is empty
   */
  peek(): Word256 {
    if (this.items.length === 0) {
      throw new StackError('Stack underflow: cannot peek empty stack')
    }
    return this.items[this.items.length - 1]
  }

  /**
   * Peek at a specific depth (0 = top of stack)
   * Throws StackError if depth is out of bounds
   */
  peekAt(depth: number): Word256 {
    if (depth < 0 || depth >= this.items.length) {
      throw new StackError(`Stack index out of bounds: ${depth}`)
    }
    return this.items[this.items.length - 1 - depth]
  }

  /**
   * Get stack depth (number of items)
   */
  depth(): number {
    return this.items.length
  }

  /**
   * Check if stack is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0
  }

  /**
   * Check if stack has at least n items
   */
  hasAtLeast(n: number): boolean {
    return this.items.length >= n
  }

  /**
   * Check if stack can accept n more items
   */
  hasSpaceFor(n: number): boolean {
    return this.items.length + n <= MAX_STACK_DEPTH
  }

  /**
   * SWAP operation - swap top item with item at depth n (1-indexed)
   * SWAP1 swaps top with second item (depth 1)
   * SWAP16 swaps top with 17th item (depth 16)
   */
  swap(n: number): void {
    if (n < 1 || n > 16) {
      throw new StackError(`Invalid swap depth: ${n} (must be 1-16)`)
    }
    if (this.items.length < n + 1) {
      throw new StackError(`Stack underflow: need ${n + 1} items for SWAP${n}`)
    }

    const topIndex = this.items.length - 1
    const swapIndex = this.items.length - 1 - n
    const temp = this.items[topIndex]
    this.items[topIndex] = this.items[swapIndex]
    this.items[swapIndex] = temp
  }

  /**
   * DUP operation - duplicate item at depth n (1-indexed)
   * DUP1 duplicates top item
   * DUP16 duplicates 16th item
   */
  dup(n: number): void {
    if (n < 1 || n > 16) {
      throw new StackError(`Invalid dup depth: ${n} (must be 1-16)`)
    }
    if (this.items.length < n) {
      throw new StackError(`Stack underflow: need ${n} items for DUP${n}`)
    }
    if (this.items.length >= MAX_STACK_DEPTH) {
      throw new StackError(`Stack overflow: cannot DUP${n}`)
    }

    const dupIndex = this.items.length - n
    this.items.push(this.items[dupIndex])
  }

  /**
   * Clear all items from the stack
   */
  clear(): void {
    this.items = []
  }

  /**
   * Get all items as an array (bottom to top)
   */
  toArray(): Word256[] {
    return [...this.items]
  }

  /**
   * Get all items as an array (top to bottom)
   */
  toArrayReversed(): Word256[] {
    return [...this.items].reverse()
  }

  /**
   * Clone the stack
   */
  clone(): Stack {
    const cloned = new Stack()
    cloned.items = [...this.items]
    return cloned
  }
}
