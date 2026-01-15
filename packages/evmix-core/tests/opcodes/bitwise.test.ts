/**
 * Tests for bitwise opcodes (AND, OR, XOR, NOT, BYTE, SHL, SHR, SAR)
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

describe('AND (0x16) - Bitwise AND', () => {
  it('should compute bitwise AND', () => {
    // 0xFF AND 0x0F = 0x0F
    const result = execute([0x60, 0x0f, 0x60, 0xff, 0x16])
    expect(result.stack).toEqual([0x0fn])
  })

  it('should return 0 for disjoint bits', () => {
    // 0xF0 AND 0x0F = 0x00
    const result = execute([0x60, 0x0f, 0x60, 0xf0, 0x16])
    expect(result.stack).toEqual([0n])
  })

  it('should preserve common bits', () => {
    // 0xAA AND 0xFF = 0xAA
    const result = execute([0x60, 0xff, 0x60, 0xaa, 0x16])
    expect(result.stack).toEqual([0xaan])
  })
})

describe('OR (0x17) - Bitwise OR', () => {
  it('should compute bitwise OR', () => {
    // 0xF0 OR 0x0F = 0xFF
    const result = execute([0x60, 0x0f, 0x60, 0xf0, 0x17])
    expect(result.stack).toEqual([0xffn])
  })

  it('should return same value when ORing with 0', () => {
    const result = execute([0x60, 0x00, 0x60, 0xab, 0x17])
    expect(result.stack).toEqual([0xabn])
  })
})

describe('XOR (0x18) - Bitwise XOR', () => {
  it('should compute bitwise XOR', () => {
    // 0xFF XOR 0x0F = 0xF0
    const result = execute([0x60, 0x0f, 0x60, 0xff, 0x18])
    expect(result.stack).toEqual([0xf0n])
  })

  it('should return 0 when XORing same values', () => {
    const result = execute([0x60, 0xab, 0x60, 0xab, 0x18])
    expect(result.stack).toEqual([0n])
  })

  it('should toggle bits', () => {
    // 0xAA XOR 0xFF = 0x55 (inverts all bits in 0xAA)
    const result = execute([0x60, 0xff, 0x60, 0xaa, 0x18])
    expect(result.stack).toEqual([0x55n])
  })
})

describe('NOT (0x19) - Bitwise NOT', () => {
  it('should invert all bits', () => {
    // NOT 0 = all 1s (max uint256)
    const result = execute([0x60, 0x00, 0x19])
    const maxUint256 = (1n << 256n) - 1n
    expect(result.stack).toEqual([maxUint256])
  })

  it('should invert 0xFF to have 0s in low byte', () => {
    // NOT 0xFF
    const result = execute([0x60, 0xff, 0x19])
    const expected = ((1n << 256n) - 1n) ^ 0xffn // all 1s except lowest byte
    expect(result.stack).toEqual([expected])
  })
})

describe('BYTE (0x1a) - Extract byte', () => {
  it('should extract byte 31 (LSB)', () => {
    // BYTE 31 of 0x1234 = 0x34
    const result = execute([
      0x61, 0x12, 0x34, // PUSH2 0x1234
      0x60, 31,         // PUSH1 31
      0x1a              // BYTE
    ])
    expect(result.stack).toEqual([0x34n])
  })

  it('should extract byte 30', () => {
    // BYTE 30 of 0x1234 = 0x12
    const result = execute([
      0x61, 0x12, 0x34, // PUSH2 0x1234
      0x60, 30,         // PUSH1 30
      0x1a              // BYTE
    ])
    expect(result.stack).toEqual([0x12n])
  })

  it('should return 0 for index >= 32', () => {
    const result = execute([
      0x60, 0xff, // PUSH1 0xFF
      0x60, 32,   // PUSH1 32
      0x1a        // BYTE
    ])
    expect(result.stack).toEqual([0n])
  })

  it('should extract byte 0 (MSB) correctly', () => {
    // For a single-byte value, byte 0-30 should be 0, byte 31 = value
    const result = execute([
      0x60, 0xab, // PUSH1 0xAB
      0x60, 0,    // PUSH1 0 (MSB position)
      0x1a        // BYTE
    ])
    expect(result.stack).toEqual([0n]) // MSB is 0 for small value
  })
})

describe('SHL (0x1b) - Shift left', () => {
  it('should shift left by 1', () => {
    // Stack order: push value first, push shift second
    // 1 << 1 = 2
    const result = execute([0x60, 1, 0x60, 1, 0x1b])
    expect(result.stack).toEqual([2n])
  })

  it('should shift left by 8', () => {
    // 1 << 8 = 256 (push 1 first, push 8 second)
    const result = execute([0x60, 1, 0x60, 8, 0x1b])
    expect(result.stack).toEqual([256n])
  })

  it('should return 0 for shift >= 256', () => {
    // Any value << 256 = 0 (push value first, push 256 second)
    const result = execute([
      0x60, 0xff,       // PUSH1 0xFF (value)
      0x61, 0x01, 0x00, // PUSH2 256 (shift)
      0x1b              // SHL
    ])
    expect(result.stack).toEqual([0n])
  })

  it('should handle shift of 0', () => {
    // 0xab << 0 = 0xab (push 0xab first, push 0 second)
    const result = execute([0x60, 0xab, 0x60, 0, 0x1b])
    expect(result.stack).toEqual([0xabn])
  })
})

describe('SHR (0x1c) - Logical shift right', () => {
  it('should shift right by 1', () => {
    // 4 >> 1 = 2 (push 4 first, push 1 second)
    const result = execute([0x60, 4, 0x60, 1, 0x1c])
    expect(result.stack).toEqual([2n])
  })

  it('should shift right by 4', () => {
    // 0xFF >> 4 = 0x0F (push 0xFF first, push 4 second)
    const result = execute([0x60, 0xff, 0x60, 4, 0x1c])
    expect(result.stack).toEqual([0x0fn])
  })

  it('should return 0 for shift >= 256', () => {
    // push value first, push shift second
    const result = execute([
      0x60, 0xff,       // PUSH1 0xFF (value)
      0x61, 0x01, 0x00, // PUSH2 256 (shift)
      0x1c              // SHR
    ])
    expect(result.stack).toEqual([0n])
  })
})

describe('SAR (0x1d) - Arithmetic shift right', () => {
  it('should shift positive values like SHR', () => {
    // 8 >> 1 = 4 (push 8 first, push 1 second)
    const result = execute([0x60, 8, 0x60, 1, 0x1d])
    expect(result.stack).toEqual([4n])
  })

  it('should preserve sign for negative values', () => {
    // -2 >> 1 = -1 (push -2 first, push 1 second)
    const bytecode = [
      0x7f, ...Array(31).fill(0xff), 0xfe, // PUSH32 -2 (value)
      0x60, 1,                              // PUSH1 1 (shift)
      0x1d                                  // SAR
    ]
    const result = execute(bytecode)
    const expected = (1n << 256n) - 1n // -1 = all 1s
    expect(result.stack).toEqual([expected])
  })

  it('should return all 1s for negative value shifted >= 256', () => {
    // push -1 first (value), push 256 second (shift)
    const bytecode = [
      0x7f, ...Array(32).fill(0xff),       // PUSH32 -1 (value)
      0x61, 0x01, 0x00,                    // PUSH2 256 (shift)
      0x1d                                  // SAR
    ]
    const result = execute(bytecode)
    const expected = (1n << 256n) - 1n // -1
    expect(result.stack).toEqual([expected])
  })

  it('should return 0 for positive value shifted >= 256', () => {
    // push 127 first (value), push 256 second (shift)
    const bytecode = [
      0x60, 0x7f,       // PUSH1 127 (value)
      0x61, 0x01, 0x00, // PUSH2 256 (shift)
      0x1d              // SAR
    ]
    const result = execute(bytecode)
    expect(result.stack).toEqual([0n])
  })
})
