/**
 * Tests for arithmetic opcodes (SDIV, MOD, SMOD, ADDMOD, MULMOD, EXP, SIGNEXTEND)
 */
import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { MemoryHost } from '../../src/host/MemoryHost'

function execute(bytecode: number[]): { stack: bigint[]; halted: boolean } {
  const interpreter = new Interpreter({
    bytecode: new Uint8Array(bytecode),
    initialGas: 1000000n,
    host: new MemoryHost(),
  })
  interpreter.run()
  return {
    stack: interpreter.getStack().toArray().map(w => w.value),
    halted: interpreter.isHalted(),
  }
}

describe('SDIV (0x05) - Signed division', () => {
  it('should divide positive by positive', () => {
    // 10 / 2 = 5
    const result = execute([0x60, 10, 0x60, 2, 0x05])
    expect(result.stack).toEqual([5n])
  })

  it('should divide negative by positive', () => {
    // -10 / 2 = -5
    // -10 in 256-bit is all 1s except lowest bits
    const neg10 = Array(32).fill(0xff)
    neg10[31] = 0xf6 // -10 = 0xff...f6
    const result = execute([
      0x7f, ...neg10, // PUSH32 -10
      0x60, 2,        // PUSH1 2
      0x05            // SDIV
    ])
    // -5 in 256-bit
    const expected = (1n << 256n) - 5n
    expect(result.stack).toEqual([expected])
  })

  it('should return 0 for division by zero', () => {
    const result = execute([0x60, 10, 0x60, 0, 0x05])
    expect(result.stack).toEqual([0n])
  })
})

describe('MOD (0x06) - Unsigned modulo', () => {
  it('should compute 10 mod 3 = 1', () => {
    const result = execute([0x60, 10, 0x60, 3, 0x06])
    expect(result.stack).toEqual([1n])
  })

  it('should compute 17 mod 5 = 2', () => {
    const result = execute([0x60, 17, 0x60, 5, 0x06])
    expect(result.stack).toEqual([2n])
  })

  it('should return 0 for mod by zero', () => {
    const result = execute([0x60, 10, 0x60, 0, 0x06])
    expect(result.stack).toEqual([0n])
  })

  it('should return 0 when a < b', () => {
    const result = execute([0x60, 3, 0x60, 10, 0x06])
    expect(result.stack).toEqual([3n])
  })
})

describe('SMOD (0x07) - Signed modulo', () => {
  it('should compute 10 smod 3 = 1', () => {
    const result = execute([0x60, 10, 0x60, 3, 0x07])
    expect(result.stack).toEqual([1n])
  })

  it('should compute -10 smod 3 = -1', () => {
    // -10 mod 3 = -1 (sign follows dividend)
    const neg10 = Array(32).fill(0xff)
    neg10[31] = 0xf6
    const result = execute([
      0x7f, ...neg10, // PUSH32 -10
      0x60, 3,        // PUSH1 3
      0x07            // SMOD
    ])
    // -1 in 256-bit
    const expected = (1n << 256n) - 1n
    expect(result.stack).toEqual([expected])
  })

  it('should return 0 for smod by zero', () => {
    const result = execute([0x60, 10, 0x60, 0, 0x07])
    expect(result.stack).toEqual([0n])
  })
})

describe('ADDMOD (0x08) - Addition modulo', () => {
  it('should compute (10 + 5) mod 8 = 7', () => {
    // Stack order: push a, push b, push N
    const result = execute([0x60, 10, 0x60, 5, 0x60, 8, 0x08])
    expect(result.stack).toEqual([7n])
  })

  it('should handle overflow correctly', () => {
    // (MAX + 1) mod 2 = 0
    // This tests that intermediate sum doesn't overflow
    const max = Array(32).fill(0xff)
    const result = execute([
      0x7f, ...max,  // PUSH32 MAX_UINT256
      0x60, 1,       // PUSH1 1
      0x60, 2,       // PUSH1 2
      0x08           // ADDMOD
    ])
    expect(result.stack).toEqual([0n])
  })

  it('should return 0 when N is 0', () => {
    const result = execute([0x60, 10, 0x60, 5, 0x60, 0, 0x08])
    expect(result.stack).toEqual([0n])
  })
})

describe('MULMOD (0x09) - Multiplication modulo', () => {
  it('should compute (10 * 5) mod 8 = 2', () => {
    // 50 mod 8 = 2
    const result = execute([0x60, 10, 0x60, 5, 0x60, 8, 0x09])
    expect(result.stack).toEqual([2n])
  })

  it('should handle overflow correctly', () => {
    // Test with large numbers that would overflow 256 bits
    // 2^128 * 2^128 mod (2^128 + 1)
    const pow128 = [0x01, ...Array(16).fill(0x00)]
    const result = execute([
      0x70, ...pow128,      // PUSH17 2^128
      0x70, ...pow128,      // PUSH17 2^128
      0x60, 7,              // PUSH1 7
      0x09                  // MULMOD
    ])
    // (2^128 * 2^128) mod 7 = 2^256 mod 7 = some value
    // 2^256 mod 7 = (2^3)^85 * 2 mod 7 = 1^85 * 2 mod 7 = 2
    expect(result.stack).toEqual([2n])
  })

  it('should return 0 when N is 0', () => {
    const result = execute([0x60, 10, 0x60, 5, 0x60, 0, 0x09])
    expect(result.stack).toEqual([0n])
  })
})

describe('EXP (0x0a) - Exponentiation', () => {
  it('should compute 2^8 = 256', () => {
    const result = execute([0x60, 2, 0x60, 8, 0x0a])
    expect(result.stack).toEqual([256n])
  })

  it('should compute 2^0 = 1', () => {
    const result = execute([0x60, 2, 0x60, 0, 0x0a])
    expect(result.stack).toEqual([1n])
  })

  it('should compute 0^0 = 1', () => {
    const result = execute([0x60, 0, 0x60, 0, 0x0a])
    expect(result.stack).toEqual([1n])
  })

  it('should compute 3^3 = 27', () => {
    const result = execute([0x60, 3, 0x60, 3, 0x0a])
    expect(result.stack).toEqual([27n])
  })

  it('should wrap on overflow', () => {
    // 2^256 mod 2^256 = 0 (wraps around)
    const result = execute([
      0x60, 2,              // PUSH1 2
      0x61, 0x01, 0x00,     // PUSH2 256
      0x0a                  // EXP
    ])
    expect(result.stack).toEqual([0n])
  })
})

describe('SIGNEXTEND (0x0b) - Sign extension', () => {
  it('should extend positive 1-byte value', () => {
    // Sign-extend 0x7F from 1 byte -> still 0x7F (positive)
    const result = execute([
      0x60, 0x7f,  // PUSH1 0x7F
      0x60, 0,     // PUSH1 0 (extend from byte 0 = 1 byte)
      0x0b         // SIGNEXTEND
    ])
    expect(result.stack).toEqual([0x7fn])
  })

  it('should extend negative 1-byte value', () => {
    // Sign-extend 0x80 from 1 byte -> all 1s except lowest byte
    const result = execute([
      0x60, 0x80,  // PUSH1 0x80
      0x60, 0,     // PUSH1 0 (extend from byte 0 = 1 byte)
      0x0b         // SIGNEXTEND
    ])
    // 0x80 sign-extended = 0xff...ff80
    const expected = (1n << 256n) - 128n
    expect(result.stack).toEqual([expected])
  })

  it('should extend positive 2-byte value', () => {
    // Sign-extend 0x7FFF from 2 bytes
    const result = execute([
      0x61, 0x7f, 0xff,  // PUSH2 0x7FFF
      0x60, 1,           // PUSH1 1 (extend from byte 1 = 2 bytes)
      0x0b               // SIGNEXTEND
    ])
    expect(result.stack).toEqual([0x7fffn])
  })

  it('should extend negative 2-byte value', () => {
    // Sign-extend 0x8000 from 2 bytes
    const result = execute([
      0x61, 0x80, 0x00,  // PUSH2 0x8000
      0x60, 1,           // PUSH1 1 (extend from byte 1 = 2 bytes)
      0x0b               // SIGNEXTEND
    ])
    // 0x8000 sign-extended = 0xff...ff8000
    const expected = (1n << 256n) - 0x8000n
    expect(result.stack).toEqual([expected])
  })

  it('should not change value when b >= 31', () => {
    const result = execute([
      0x60, 0x80,  // PUSH1 0x80
      0x60, 31,    // PUSH1 31
      0x0b         // SIGNEXTEND
    ])
    expect(result.stack).toEqual([0x80n])
  })
})
