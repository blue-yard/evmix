/**
 * Tests for call-related opcodes (RETURNDATASIZE, RETURNDATACOPY, CALL, STATICCALL, DELEGATECALL)
 */
import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { MemoryHost } from '../../src/host/MemoryHost'
import { Address } from '../../src/types/Address'

function execute(bytecode: number[], host?: MemoryHost): { stack: bigint[]; halted: boolean; returnData: Uint8Array } {
  const h = host || new MemoryHost()
  const interpreter = new Interpreter({
    bytecode: new Uint8Array(bytecode),
    initialGas: 1000000n,
    host: h,
  })
  interpreter.run()
  return {
    stack: interpreter.getStack().toArray().map(w => w.value),
    halted: interpreter.isHalted(),
    returnData: interpreter.getState().returnData,
  }
}

describe('RETURNDATASIZE (0x3d)', () => {
  it('should return 0 when no prior call', () => {
    // RETURNDATASIZE without prior call should be 0
    const result = execute([0x3d]) // RETURNDATASIZE
    expect(result.stack).toEqual([0n])
  })
})

describe('CALL (0xf1)', () => {
  it('should succeed when calling address with no code', () => {
    const host = new MemoryHost()
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    // Call to address with no code should succeed
    // Stack setup: gas, to, value, argsOffset, argsLength, retOffset, retLength
    // Then CALL
    const bytecode = [
      // Push arguments in reverse order (retLength first, gas last)
      0x60, 0x00,   // PUSH1 0 (retLength)
      0x60, 0x00,   // PUSH1 0 (retOffset)
      0x60, 0x00,   // PUSH1 0 (argsLength)
      0x60, 0x00,   // PUSH1 0 (argsOffset)
      0x60, 0x00,   // PUSH1 0 (value)
      // Push target address (20 bytes)
      0x73, ...targetAddress.toBytes(), // PUSH20 address
      0x62, 0x01, 0x00, 0x00, // PUSH3 65536 (gas)
      0xf1,         // CALL
    ]

    const result = execute(bytecode, host)
    // Call should succeed (1 on stack)
    expect(result.stack).toEqual([1n])
  })

  it('should call contract and get return data', () => {
    const host = new MemoryHost()
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    // Target contract: PUSH1 0x42, PUSH1 0, MSTORE8, PUSH1 1, PUSH1 0, RETURN
    // This stores 0x42 at memory[0] and returns 1 byte
    const targetCode = new Uint8Array([
      0x60, 0x42,  // PUSH1 0x42
      0x60, 0x00,  // PUSH1 0
      0x53,        // MSTORE8
      0x60, 0x01,  // PUSH1 1 (size)
      0x60, 0x00,  // PUSH1 0 (offset)
      0xf3,        // RETURN
    ])
    host.setCode(targetAddress, targetCode)

    // Main contract: call target, then RETURNDATASIZE
    const bytecode = [
      0x60, 0x20,   // PUSH1 32 (retLength)
      0x60, 0x00,   // PUSH1 0 (retOffset)
      0x60, 0x00,   // PUSH1 0 (argsLength)
      0x60, 0x00,   // PUSH1 0 (argsOffset)
      0x60, 0x00,   // PUSH1 0 (value)
      0x73, ...targetAddress.toBytes(), // PUSH20 address
      0x62, 0x0f, 0x42, 0x40, // PUSH3 1000000 (gas)
      0xf1,         // CALL
      0x3d,         // RETURNDATASIZE
    ]

    const result = execute(bytecode, host)
    // Stack: [success (1), returnDataSize (1)]
    expect(result.stack).toEqual([1n, 1n])
  })

  it('should fail when call depth exceeds 1024', () => {
    const host = new MemoryHost()
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    // Set up a contract that just returns
    host.setCode(targetAddress, new Uint8Array([0x00])) // STOP

    // Create interpreter at depth 1024
    const bytecode = [
      0x60, 0x00,   // retLength
      0x60, 0x00,   // retOffset
      0x60, 0x00,   // argsLength
      0x60, 0x00,   // argsOffset
      0x60, 0x00,   // value
      0x73, ...targetAddress.toBytes(), // address
      0x62, 0x0f, 0x42, 0x40, // gas
      0xf1,         // CALL
    ]

    const interpreter = new Interpreter({
      bytecode: new Uint8Array(bytecode),
      initialGas: 1000000n,
      host,
      depth: 1024, // At max depth
    })
    interpreter.run()

    // Call should fail (0 on stack) due to depth limit
    expect(interpreter.getStack().toArray().map(w => w.value)).toEqual([0n])
  })
})

describe('STATICCALL (0xfa)', () => {
  it('should call contract in read-only mode', () => {
    const host = new MemoryHost()
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    // Target contract: PUSH1 0x99, PUSH1 0, MSTORE8, PUSH1 1, PUSH1 0, RETURN
    const targetCode = new Uint8Array([
      0x60, 0x99,  // PUSH1 0x99
      0x60, 0x00,  // PUSH1 0
      0x53,        // MSTORE8
      0x60, 0x01,  // PUSH1 1 (size)
      0x60, 0x00,  // PUSH1 0 (offset)
      0xf3,        // RETURN
    ])
    host.setCode(targetAddress, targetCode)

    // STATICCALL has no value parameter
    // Stack: gas, to, argsOffset, argsLength, retOffset, retLength
    const bytecode = [
      0x60, 0x20,   // PUSH1 32 (retLength)
      0x60, 0x00,   // PUSH1 0 (retOffset)
      0x60, 0x00,   // PUSH1 0 (argsLength)
      0x60, 0x00,   // PUSH1 0 (argsOffset)
      0x73, ...targetAddress.toBytes(), // PUSH20 address
      0x62, 0x0f, 0x42, 0x40, // PUSH3 1000000 (gas)
      0xfa,         // STATICCALL
      0x3d,         // RETURNDATASIZE
    ]

    const result = execute(bytecode, host)
    // Stack: [success (1), returnDataSize (1)]
    expect(result.stack).toEqual([1n, 1n])
  })
})

describe('DELEGATECALL (0xf4)', () => {
  it('should call contract using caller storage context', () => {
    const host = new MemoryHost()
    const callerAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    host.setAddress(callerAddress)

    // Target contract: PUSH1 0xAB, PUSH1 0, MSTORE8, PUSH1 1, PUSH1 0, RETURN
    const targetCode = new Uint8Array([
      0x60, 0xab,  // PUSH1 0xAB
      0x60, 0x00,  // PUSH1 0
      0x53,        // MSTORE8
      0x60, 0x01,  // PUSH1 1 (size)
      0x60, 0x00,  // PUSH1 0 (offset)
      0xf3,        // RETURN
    ])
    host.setCode(targetAddress, targetCode)

    // DELEGATECALL has no value parameter (uses caller's value)
    // Stack: gas, to, argsOffset, argsLength, retOffset, retLength
    const bytecode = [
      0x60, 0x20,   // PUSH1 32 (retLength)
      0x60, 0x00,   // PUSH1 0 (retOffset)
      0x60, 0x00,   // PUSH1 0 (argsLength)
      0x60, 0x00,   // PUSH1 0 (argsOffset)
      0x73, ...targetAddress.toBytes(), // PUSH20 address
      0x62, 0x0f, 0x42, 0x40, // PUSH3 1000000 (gas)
      0xf4,         // DELEGATECALL
      0x3d,         // RETURNDATASIZE
    ]

    const result = execute(bytecode, host)
    // Stack: [success (1), returnDataSize (1)]
    expect(result.stack).toEqual([1n, 1n])
  })
})

describe('RETURNDATACOPY (0x3e)', () => {
  it('should copy return data to memory', () => {
    const host = new MemoryHost()
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    // Target contract returns 0x42
    const targetCode = new Uint8Array([
      0x60, 0x42,  // PUSH1 0x42
      0x60, 0x00,  // PUSH1 0
      0x53,        // MSTORE8
      0x60, 0x01,  // PUSH1 1 (size)
      0x60, 0x00,  // PUSH1 0 (offset)
      0xf3,        // RETURN
    ])
    host.setCode(targetAddress, targetCode)

    // Call, then copy return data and load it
    const bytecode = [
      // First CALL
      0x60, 0x01,   // PUSH1 1 (retLength)
      0x60, 0x40,   // PUSH1 64 (retOffset - we'll copy here)
      0x60, 0x00,   // PUSH1 0 (argsLength)
      0x60, 0x00,   // PUSH1 0 (argsOffset)
      0x60, 0x00,   // PUSH1 0 (value)
      0x73, ...targetAddress.toBytes(),
      0x62, 0x0f, 0x42, 0x40, // gas
      0xf1,         // CALL

      // Now RETURNDATACOPY
      0x60, 0x01,   // PUSH1 1 (length)
      0x60, 0x00,   // PUSH1 0 (source offset in return data)
      0x60, 0x80,   // PUSH1 128 (dest offset in memory)
      0x3e,         // RETURNDATACOPY

      // Load the copied byte
      0x60, 0x80,   // PUSH1 128
      0x51,         // MLOAD
    ]

    const result = execute(bytecode, host)
    // Stack: [success (1), value loaded from memory]
    // The value should have 0x42 in the MSB position after MLOAD
    expect(result.stack[0]).toEqual(1n)
    // 0x42 at memory[128] -> MLOAD reads 32 bytes, 0x42 is at MSB
    expect(result.stack[1]).toEqual(0x4200000000000000000000000000000000000000000000000000000000000000n)
  })
})

describe('Call with arguments and return values', () => {
  it('should pass calldata to target and receive return data', () => {
    const host = new MemoryHost()
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    // Target contract: loads first 32 bytes of calldata, adds 1, returns it
    const targetCode = new Uint8Array([
      0x60, 0x00,  // PUSH1 0
      0x35,        // CALLDATALOAD (loads 32 bytes from calldata[0])
      0x60, 0x01,  // PUSH1 1
      0x01,        // ADD
      0x60, 0x00,  // PUSH1 0
      0x52,        // MSTORE
      0x60, 0x20,  // PUSH1 32 (size)
      0x60, 0x00,  // PUSH1 0 (offset)
      0xf3,        // RETURN
    ])
    host.setCode(targetAddress, targetCode)

    // Main: store value in memory (as full 32-byte word), call with it, check return
    const bytecode = [
      // Store 0x05 as a 32-byte word at memory offset 0
      0x60, 0x05,   // PUSH1 5
      0x60, 0x00,   // PUSH1 0
      0x52,         // MSTORE (stores as 32-byte word)

      // CALL with 32 bytes of calldata
      0x60, 0x20,   // retLength = 32
      0x60, 0x40,   // retOffset = 64
      0x60, 0x20,   // argsLength = 32
      0x60, 0x00,   // argsOffset = 0
      0x60, 0x00,   // value = 0
      0x73, ...targetAddress.toBytes(),
      0x62, 0x0f, 0x42, 0x40, // gas
      0xf1,         // CALL

      // Load return value from memory
      0x60, 0x40,   // PUSH1 64 (where return data was written)
      0x51,         // MLOAD
    ]

    const result = execute(bytecode, host)
    expect(result.stack[0]).toEqual(1n) // success
    // 0x05 + 0x01 = 0x06
    expect(result.stack[1]).toEqual(6n)
  })
})
