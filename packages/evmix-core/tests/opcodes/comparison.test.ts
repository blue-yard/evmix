/**
 * Tests for comparison opcodes (LT, GT, SLT, SGT, EQ, ISZERO)
 */
import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { MemoryHost } from '../../src/host/MemoryHost'

function execute(bytecode: number[]): { stack: bigint[]; halted: boolean } {
  const interpreter = new Interpreter({
    bytecode: new Uint8Array(bytecode),
    initialGas: 100000n,
    host: new MemoryHost(),
  })
  interpreter.run()
  return {
    stack: interpreter.getStack().toArray().map(w => w.value),
    halted: interpreter.isHalted(),
  }
}

describe('LT (0x10) - Unsigned less than', () => {
  it('should return 1 when a < b', () => {
    // Stack order: push 10 (bottom), push 5 (top)
    // LT pops b=5, a=10, computes a < b = 10 < 5 = false
    // To get 5 < 10 = true, push 5 first, then 10
    const result = execute([0x60, 5, 0x60, 10, 0x10])
    expect(result.stack).toEqual([1n]) // 5 < 10 = true
  })

  it('should return 0 when a >= b', () => {
    // push 10 first, push 5 second -> a=10, b=5, 10 < 5 = false
    const result = execute([0x60, 10, 0x60, 5, 0x10])
    expect(result.stack).toEqual([0n])
  })

  it('should return 0 when a == b', () => {
    const result = execute([0x60, 5, 0x60, 5, 0x10])
    expect(result.stack).toEqual([0n])
  })
})

describe('GT (0x11) - Unsigned greater than', () => {
  it('should return 1 when a > b', () => {
    // push 5 first, push 10 second -> a=5, b=10, 5 > 10 = false
    // To get 10 > 5 = true, push 10 first, then 5
    const result = execute([0x60, 10, 0x60, 5, 0x11])
    expect(result.stack).toEqual([1n]) // 10 > 5 = true
  })

  it('should return 0 when a <= b', () => {
    // push 5 first, push 10 second -> a=5, b=10, 5 > 10 = false
    const result = execute([0x60, 5, 0x60, 10, 0x11])
    expect(result.stack).toEqual([0n])
  })
})

describe('SLT (0x12) - Signed less than', () => {
  it('should return 1 for negative < positive', () => {
    // Push -1 first (bottom), push 1 second (top)
    // SLT pops b=1, pops a=-1, compares a < b = -1 < 1 = true
    const bytecode = [
      0x7f, ...Array(32).fill(0xff), // PUSH32 -1
      0x60, 1,                        // PUSH1 1
      0x12                            // SLT
    ]
    const result = execute(bytecode)
    expect(result.stack).toEqual([1n])
  })

  it('should return 0 for positive not < negative', () => {
    // Push 1 first (bottom), push -1 second (top)
    // SLT pops b=-1, pops a=1, compares a < b = 1 < -1 = false
    const bytecode = [
      0x60, 1,                        // PUSH1 1
      0x7f, ...Array(32).fill(0xff), // PUSH32 -1
      0x12                            // SLT
    ]
    const result = execute(bytecode)
    expect(result.stack).toEqual([0n])
  })
})

describe('SGT (0x13) - Signed greater than', () => {
  it('should return 1 for positive > negative', () => {
    // Push 1 first (bottom), push -1 second (top)
    // SGT pops b=-1, pops a=1, compares a > b = 1 > -1 = true
    const bytecode = [
      0x60, 1,                        // PUSH1 1
      0x7f, ...Array(32).fill(0xff), // PUSH32 -1
      0x13                            // SGT
    ]
    const result = execute(bytecode)
    expect(result.stack).toEqual([1n])
  })

  it('should return 0 for negative not > positive', () => {
    // Push -1 first (bottom), push 1 second (top)
    // SGT pops b=1, pops a=-1, compares a > b = -1 > 1 = false
    const bytecode = [
      0x7f, ...Array(32).fill(0xff), // PUSH32 -1
      0x60, 1,                        // PUSH1 1
      0x13                            // SGT
    ]
    const result = execute(bytecode)
    expect(result.stack).toEqual([0n])
  })
})

describe('EQ (0x14) - Equality', () => {
  it('should return 1 when values are equal', () => {
    const result = execute([0x60, 42, 0x60, 42, 0x14])
    expect(result.stack).toEqual([1n])
  })

  it('should return 0 when values are not equal', () => {
    const result = execute([0x60, 42, 0x60, 43, 0x14])
    expect(result.stack).toEqual([0n])
  })

  it('should handle zero comparison', () => {
    const result = execute([0x60, 0, 0x60, 0, 0x14])
    expect(result.stack).toEqual([1n])
  })
})

describe('ISZERO (0x15) - Is zero', () => {
  it('should return 1 for zero', () => {
    const result = execute([0x60, 0, 0x15])
    expect(result.stack).toEqual([1n])
  })

  it('should return 0 for non-zero', () => {
    const result = execute([0x60, 1, 0x15])
    expect(result.stack).toEqual([0n])
  })

  it('should return 0 for large non-zero', () => {
    const result = execute([0x60, 255, 0x15])
    expect(result.stack).toEqual([0n])
  })
})
