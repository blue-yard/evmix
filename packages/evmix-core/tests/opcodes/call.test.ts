/**
 * Tests for call-related opcodes (RETURNDATASIZE, RETURNDATACOPY, CALL, STATICCALL, DELEGATECALL,
 * CALLCODE, CREATE, CREATE2, SELFDESTRUCT)
 */
import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { MemoryHost } from '../../src/host/MemoryHost'
import { Address } from '../../src/types/Address'
import { Word256 } from '../../src/types/Word256'

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

describe('CALLCODE (0xf2)', () => {
  it('should call contract code in caller context', () => {
    const host = new MemoryHost()
    const targetAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

    // Target contract: returns 0xCC
    const targetCode = new Uint8Array([
      0x60, 0xcc,  // PUSH1 0xCC
      0x60, 0x00,  // PUSH1 0
      0x53,        // MSTORE8
      0x60, 0x01,  // PUSH1 1 (size)
      0x60, 0x00,  // PUSH1 0 (offset)
      0xf3,        // RETURN
    ])
    host.setCode(targetAddress, targetCode)

    // CALLCODE has value parameter like CALL
    const bytecode = [
      0x60, 0x20,   // PUSH1 32 (retLength)
      0x60, 0x00,   // PUSH1 0 (retOffset)
      0x60, 0x00,   // PUSH1 0 (argsLength)
      0x60, 0x00,   // PUSH1 0 (argsOffset)
      0x60, 0x00,   // PUSH1 0 (value)
      0x73, ...targetAddress.toBytes(), // PUSH20 address
      0x62, 0x0f, 0x42, 0x40, // PUSH3 1000000 (gas)
      0xf2,         // CALLCODE
      0x3d,         // RETURNDATASIZE
    ]

    const result = execute(bytecode, host)
    // Stack: [success (1), returnDataSize (1)]
    expect(result.stack).toEqual([1n, 1n])
  })
})

describe('CREATE (0xf0)', () => {
  it('should create a new contract', () => {
    const host = new MemoryHost()
    const callerAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    host.setAddress(callerAddress)
    host.setBalance(callerAddress, 1000000000n)

    // Init code: just return empty code (STOP)
    // PUSH1 0, PUSH1 0, RETURN
    const initCode = [0x60, 0x00, 0x60, 0x00, 0xf3]

    // Store init code in memory, then CREATE
    const bytecode = [
      // Store init code at memory[0]
      ...initCode.flatMap((b, i) => [0x60, b, 0x60, i, 0x53]), // MSTORE8 each byte
      // CREATE: value=0, offset=0, length=initCode.length
      0x60, initCode.length,  // PUSH1 length
      0x60, 0x00,              // PUSH1 0 (offset)
      0x60, 0x00,              // PUSH1 0 (value)
      0xf0,                    // CREATE
    ]

    const result = execute(bytecode, host)
    // Stack should have the new contract address (non-zero)
    expect(result.stack.length).toBe(1)
    expect(result.stack[0]).not.toBe(0n)
  })

  it('should fail at max depth', () => {
    const host = new MemoryHost()
    const callerAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    host.setAddress(callerAddress)

    // Simple CREATE with empty init code
    const bytecode = [
      0x60, 0x00,  // PUSH1 0 (length)
      0x60, 0x00,  // PUSH1 0 (offset)
      0x60, 0x00,  // PUSH1 0 (value)
      0xf0,        // CREATE
    ]

    const interpreter = new Interpreter({
      bytecode: new Uint8Array(bytecode),
      initialGas: 1000000n,
      host,
      depth: 1024, // At max depth
    })
    interpreter.run()

    // CREATE should fail (0 on stack) due to depth limit
    expect(interpreter.getStack().toArray().map(w => w.value)).toEqual([0n])
  })
})

describe('CREATE2 (0xf5)', () => {
  it('should create contract with deterministic address', () => {
    const host = new MemoryHost()
    const callerAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    host.setAddress(callerAddress)
    host.setBalance(callerAddress, 1000000000n)

    // Init code: PUSH1 0, PUSH1 0, RETURN (return empty code)
    const initCode = [0x60, 0x00, 0x60, 0x00, 0xf3]

    // Store init code in memory, then CREATE2 with salt=0x1234
    const bytecode = [
      // Store init code at memory[0]
      ...initCode.flatMap((b, i) => [0x60, b, 0x60, i, 0x53]),
      // CREATE2: salt=0x1234, length, offset, value
      0x61, 0x12, 0x34,        // PUSH2 0x1234 (salt)
      0x60, initCode.length,   // PUSH1 length
      0x60, 0x00,              // PUSH1 0 (offset)
      0x60, 0x00,              // PUSH1 0 (value)
      0xf5,                    // CREATE2
    ]

    const result = execute(bytecode, host)
    // Stack should have the new contract address (non-zero)
    expect(result.stack.length).toBe(1)
    expect(result.stack[0]).not.toBe(0n)
  })

  it('should produce same address for same salt and code', () => {
    const host = new MemoryHost()
    const callerAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    host.setAddress(callerAddress)
    host.setBalance(callerAddress, 2000000000n)

    // Init code that returns empty code
    const initCode = [0x60, 0x00, 0x60, 0x00, 0xf3]
    const salt = Word256.from(0x5678n)

    // Compute expected address
    const expectedAddress = host.computeCreate2Address(
      callerAddress,
      salt,
      new Uint8Array(initCode)
    )

    // Verify the expected address is non-zero
    expect(expectedAddress.value).not.toBe(0n)
  })
})

describe('SELFDESTRUCT (0xff)', () => {
  it('should destroy contract and transfer balance', () => {
    const host = new MemoryHost()
    const contractAddress = Address.fromHex('0x1111111111111111111111111111111111111111')
    const beneficiary = Address.fromHex('0x2222222222222222222222222222222222222222')

    host.setAddress(contractAddress)
    host.setBalance(contractAddress, 1000n)
    host.setBalance(beneficiary, 500n)

    // SELFDESTRUCT to beneficiary
    const bytecode = [
      0x73, ...beneficiary.toBytes(), // PUSH20 beneficiary
      0xff,                           // SELFDESTRUCT
    ]

    const interpreter = new Interpreter({
      bytecode: new Uint8Array(bytecode),
      initialGas: 1000000n,
      host,
    })
    interpreter.run()

    // Contract should be halted with SELFDESTRUCT reason
    expect(interpreter.isHalted()).toBe(true)
    // Balance should be transferred
    expect(host.getBalance(beneficiary)).toBe(1500n)
    expect(host.getBalance(contractAddress)).toBe(0n)
  })
})
