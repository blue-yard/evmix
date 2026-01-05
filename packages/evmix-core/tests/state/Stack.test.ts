import { describe, it, expect } from 'vitest'
import { Stack, StackError, MAX_STACK_DEPTH } from '../../src/state/Stack'
import { Word256 } from '../../src/types/Word256'

describe('Stack', () => {
  it('initializes empty', () => {
    const stack = new Stack()
    expect(stack.depth()).toBe(0)
    expect(stack.isEmpty()).toBe(true)
  })

  describe('push and pop', () => {
    it('pushes and pops values', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      expect(stack.depth()).toBe(2)
      expect(stack.pop().value).toBe(2n)
      expect(stack.pop().value).toBe(1n)
      expect(stack.isEmpty()).toBe(true)
    })

    it('throws on pop from empty stack', () => {
      const stack = new Stack()
      expect(() => stack.pop()).toThrow(StackError)
      expect(() => stack.pop()).toThrow('Stack underflow')
    })

    it('throws on stack overflow', () => {
      const stack = new Stack()
      for (let i = 0; i < MAX_STACK_DEPTH; i++) {
        stack.push(Word256.fromNumber(i))
      }
      expect(() => stack.push(Word256.fromNumber(9999))).toThrow(StackError)
      expect(() => stack.push(Word256.fromNumber(9999))).toThrow('Stack overflow')
    })
  })

  describe('peek', () => {
    it('peeks at top without removing', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      expect(stack.peek().value).toBe(2n)
      expect(stack.depth()).toBe(2)
    })

    it('peeks at specific depth', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      stack.push(Word256.fromNumber(3))
      expect(stack.peekAt(0).value).toBe(3n) // top
      expect(stack.peekAt(1).value).toBe(2n)
      expect(stack.peekAt(2).value).toBe(1n) // bottom
    })

    it('throws on peek empty stack', () => {
      const stack = new Stack()
      expect(() => stack.peek()).toThrow(StackError)
    })

    it('throws on peekAt out of bounds', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      expect(() => stack.peekAt(1)).toThrow(StackError)
      expect(() => stack.peekAt(-1)).toThrow(StackError)
    })
  })

  describe('stack checks', () => {
    it('checks if has at least n items', () => {
      const stack = new Stack()
      expect(stack.hasAtLeast(1)).toBe(false)
      stack.push(Word256.fromNumber(1))
      expect(stack.hasAtLeast(1)).toBe(true)
      expect(stack.hasAtLeast(2)).toBe(false)
      stack.push(Word256.fromNumber(2))
      expect(stack.hasAtLeast(2)).toBe(true)
    })

    it('checks if has space for n items', () => {
      const stack = new Stack()
      expect(stack.hasSpaceFor(1)).toBe(true)
      expect(stack.hasSpaceFor(MAX_STACK_DEPTH)).toBe(true)
      expect(stack.hasSpaceFor(MAX_STACK_DEPTH + 1)).toBe(false)

      for (let i = 0; i < MAX_STACK_DEPTH - 1; i++) {
        stack.push(Word256.fromNumber(i))
      }
      expect(stack.hasSpaceFor(1)).toBe(true)
      expect(stack.hasSpaceFor(2)).toBe(false)
    })
  })

  describe('swap', () => {
    it('swaps top with second (SWAP1)', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      stack.swap(1)
      expect(stack.pop().value).toBe(1n)
      expect(stack.pop().value).toBe(2n)
    })

    it('swaps top with deeper items', () => {
      const stack = new Stack()
      for (let i = 1; i <= 5; i++) {
        stack.push(Word256.fromNumber(i))
      }
      stack.swap(3) // swap 5 with 2
      const items = []
      while (!stack.isEmpty()) {
        items.push(stack.pop().value)
      }
      expect(items).toEqual([2n, 4n, 3n, 5n, 1n])
    })

    it('throws on invalid swap depth', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      expect(() => stack.swap(0)).toThrow(StackError)
      expect(() => stack.swap(17)).toThrow(StackError)
    })

    it('throws on stack underflow for swap', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      expect(() => stack.swap(1)).toThrow(StackError)
      expect(() => stack.swap(1)).toThrow('Stack underflow')
    })
  })

  describe('dup', () => {
    it('duplicates top (DUP1)', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(42))
      stack.dup(1)
      expect(stack.depth()).toBe(2)
      expect(stack.pop().value).toBe(42n)
      expect(stack.pop().value).toBe(42n)
    })

    it('duplicates deeper items', () => {
      const stack = new Stack()
      for (let i = 1; i <= 5; i++) {
        stack.push(Word256.fromNumber(i))
      }
      stack.dup(3) // duplicate 3rd item (which is 3)
      expect(stack.depth()).toBe(6)
      expect(stack.pop().value).toBe(3n)
      expect(stack.pop().value).toBe(5n)
    })

    it('throws on invalid dup depth', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      expect(() => stack.dup(0)).toThrow(StackError)
      expect(() => stack.dup(17)).toThrow(StackError)
    })

    it('throws on stack underflow for dup', () => {
      const stack = new Stack()
      expect(() => stack.dup(1)).toThrow(StackError)
      expect(() => stack.dup(1)).toThrow('Stack underflow')
    })

    it('throws on stack overflow for dup', () => {
      const stack = new Stack()
      for (let i = 0; i < MAX_STACK_DEPTH; i++) {
        stack.push(Word256.fromNumber(i))
      }
      expect(() => stack.dup(1)).toThrow(StackError)
      expect(() => stack.dup(1)).toThrow('Stack overflow')
    })
  })

  describe('utility', () => {
    it('clears stack', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      stack.clear()
      expect(stack.depth()).toBe(0)
      expect(stack.isEmpty()).toBe(true)
    })

    it('converts to array', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      stack.push(Word256.fromNumber(3))
      const arr = stack.toArray()
      expect(arr.map((w) => w.value)).toEqual([1n, 2n, 3n])
    })

    it('converts to reversed array', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      stack.push(Word256.fromNumber(3))
      const arr = stack.toArrayReversed()
      expect(arr.map((w) => w.value)).toEqual([3n, 2n, 1n])
    })

    it('clones stack', () => {
      const stack = new Stack()
      stack.push(Word256.fromNumber(1))
      stack.push(Word256.fromNumber(2))
      const cloned = stack.clone()
      expect(cloned.depth()).toBe(2)
      stack.push(Word256.fromNumber(3))
      expect(cloned.depth()).toBe(2)
    })
  })
})
