/**
 * Tests for cryptographic opcodes (KECCAK256)
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

describe('KECCAK256 (0x20) - Keccak-256 hash', () => {
  it('should hash empty data', () => {
    // KECCAK256 of empty string
    // Push 0 (size), Push 0 (offset), KECCAK256
    const result = execute([0x60, 0, 0x60, 0, 0x20])
    // keccak256("") = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
    const expected = BigInt('0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
    expect(result.stack).toEqual([expected])
  })

  it('should hash a single byte', () => {
    // Store 0x01 at memory offset 0, then hash 1 byte
    // PUSH1 0x01, PUSH1 0, MSTORE8, PUSH1 1 (size), PUSH1 0 (offset), KECCAK256
    const result = execute([
      0x60, 0x01,   // PUSH1 0x01
      0x60, 0x00,   // PUSH1 0
      0x53,         // MSTORE8 - store 0x01 at memory[0]
      0x60, 0x01,   // PUSH1 1 (size)
      0x60, 0x00,   // PUSH1 0 (offset)
      0x20,         // KECCAK256
    ])
    // keccak256(0x01) = 0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2
    const expected = BigInt('0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2')
    expect(result.stack).toEqual([expected])
  })

  it('should hash multiple bytes', () => {
    // Store "hello" (0x68656c6c6f) at memory offset 0, then hash 5 bytes
    // We'll store it as a 32-byte word aligned to byte 0
    const result = execute([
      // Store 'hello' (ASCII: 0x68=h, 0x65=e, 0x6c=l, 0x6c=l, 0x6f=o)
      // PUSH5 doesn't exist, so we'll use MSTORE8 multiple times
      0x60, 0x68,   // PUSH1 'h'
      0x60, 0x00,   // PUSH1 0
      0x53,         // MSTORE8
      0x60, 0x65,   // PUSH1 'e'
      0x60, 0x01,   // PUSH1 1
      0x53,         // MSTORE8
      0x60, 0x6c,   // PUSH1 'l'
      0x60, 0x02,   // PUSH1 2
      0x53,         // MSTORE8
      0x60, 0x6c,   // PUSH1 'l'
      0x60, 0x03,   // PUSH1 3
      0x53,         // MSTORE8
      0x60, 0x6f,   // PUSH1 'o'
      0x60, 0x04,   // PUSH1 4
      0x53,         // MSTORE8
      0x60, 0x05,   // PUSH1 5 (size)
      0x60, 0x00,   // PUSH1 0 (offset)
      0x20,         // KECCAK256
    ])
    // keccak256("hello") = 0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8
    const expected = BigInt('0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8')
    expect(result.stack).toEqual([expected])
  })

  it('should hash 32 bytes', () => {
    // Store a 32-byte value and hash it
    const result = execute([
      // Use MSTORE to store 32 bytes at once
      // PUSH32 all ones, PUSH1 0, MSTORE, PUSH1 32, PUSH1 0, KECCAK256
      0x7f, ...Array(32).fill(0xff), // PUSH32 all 0xff
      0x60, 0x00,                     // PUSH1 0
      0x52,                           // MSTORE
      0x60, 0x20,                     // PUSH1 32 (size)
      0x60, 0x00,                     // PUSH1 0 (offset)
      0x20,                           // KECCAK256
    ])
    // keccak256(32 bytes of 0xff)
    const expected = BigInt('0xa9c584056064687e149968cbab758a3376d22aedc6a55823d1b3ecbee81b8fb9')
    expect(result.stack).toEqual([expected])
  })

  it('should hash data at non-zero offset', () => {
    // Store data at offset 32, then hash it
    const result = execute([
      0x60, 0xab,   // PUSH1 0xab
      0x60, 0x20,   // PUSH1 32 (offset)
      0x53,         // MSTORE8
      0x60, 0x01,   // PUSH1 1 (size)
      0x60, 0x20,   // PUSH1 32 (offset)
      0x20,         // KECCAK256
    ])
    // keccak256(0xab)
    const expected = BigInt('0x468fc9c005382579139846222b7b0aebc9182ba073b2455938a86d9753bfb078')
    expect(result.stack).toEqual([expected])
  })

  it('should handle size larger than stored data (zeros)', () => {
    // Hash 32 bytes but only 1 byte is non-zero, rest should be 0
    const result = execute([
      0x60, 0x01,   // PUSH1 0x01
      0x60, 0x00,   // PUSH1 0
      0x53,         // MSTORE8 - store 0x01 at memory[0]
      0x60, 0x20,   // PUSH1 32 (size) - hash 32 bytes
      0x60, 0x00,   // PUSH1 0 (offset)
      0x20,         // KECCAK256
    ])
    // keccak256(0x01 followed by 31 zero bytes)
    const expected = BigInt('0x48078cfed56339ea54962e72c37c7f588fc4f8e5bc173827ba75cb10a63a96a5')
    expect(result.stack).toEqual([expected])
  })

  it('should compute correct gas for zero-length hash', () => {
    // KECCAK256 of empty: gas = 30 + 6 * 0 = 30
    const interpreter = new Interpreter({
      bytecode: new Uint8Array([0x60, 0, 0x60, 0, 0x20]),
      initialGas: 1000000n,
      host: new MemoryHost(),
    })
    interpreter.run()
    // Gas used should include: PUSH1 (3) + PUSH1 (3) + KECCAK256 (30) = 36
    // Plus any memory expansion (none for empty)
    const gasUsed = 1000000n - interpreter.getState().gasRemaining
    expect(gasUsed).toEqual(36n)
  })

  it('should compute correct gas for 32-byte hash', () => {
    // KECCAK256 of 32 bytes: gas = 30 + 6 * 1 = 36 (plus memory expansion)
    const interpreter = new Interpreter({
      bytecode: new Uint8Array([
        0x7f, ...Array(32).fill(0xff), // PUSH32 (3 gas)
        0x60, 0x00,                     // PUSH1 (3 gas)
        0x52,                           // MSTORE (3 + memory expansion)
        0x60, 0x20,                     // PUSH1 (3 gas)
        0x60, 0x00,                     // PUSH1 (3 gas)
        0x20,                           // KECCAK256 (36 gas)
      ]),
      initialGas: 1000000n,
      host: new MemoryHost(),
    })
    interpreter.run()
    const gasUsed = 1000000n - interpreter.getState().gasRemaining
    // PUSH32: 3, PUSH1: 3, MSTORE: 3 + memory, PUSH1: 3, PUSH1: 3, KECCAK256: 36
    // Memory expansion for 32 bytes: 3 (base) + 0 (quadratic at this size) = 3
    // Total: 3 + 3 + 3 + 3 + 3 + 3 + 36 = 54
    expect(gasUsed).toEqual(54n)
  })

  it('should compute correct gas for 64-byte hash', () => {
    // KECCAK256 of 64 bytes: gas = 30 + 6 * 2 = 42 (plus memory expansion)
    const interpreter = new Interpreter({
      bytecode: new Uint8Array([
        0x7f, ...Array(32).fill(0xff), // PUSH32 at offset 0 (3 gas)
        0x60, 0x00,                     // PUSH1 (3 gas)
        0x52,                           // MSTORE (3 + mem)
        0x7f, ...Array(32).fill(0xaa), // PUSH32 at offset 32 (3 gas)
        0x60, 0x20,                     // PUSH1 (3 gas)
        0x52,                           // MSTORE (3 + mem)
        0x60, 0x40,                     // PUSH1 64 (3 gas)
        0x60, 0x00,                     // PUSH1 0 (3 gas)
        0x20,                           // KECCAK256 (42 gas)
      ]),
      initialGas: 1000000n,
      host: new MemoryHost(),
    })
    interpreter.run()
    const gasUsed = 1000000n - interpreter.getState().gasRemaining
    // Base ops: 3+3+3 + 3+3+3 + 3+3 + 42 = 66
    // Memory expansion: first MSTORE allocates 32 bytes (3), second expands to 64 (3)
    // Total: 66 + 3 + 3 = 72
    expect(gasUsed).toEqual(72n)
  })
})
