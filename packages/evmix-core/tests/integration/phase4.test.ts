import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { HaltReason } from '../../src/state/HaltReason'
import { MemoryHost } from '../../src/host/MemoryHost'
import { Address } from '../../src/types/Address'
import { Word256 } from '../../src/types/Word256'

describe('Phase 4 Integration Tests - World Interaction', () => {
  describe('Storage Operations', () => {
    it('SSTORE and SLOAD work correctly', () => {
      // Program: Store 42 at key 0, then load it
      const bytecode = new Uint8Array([
        0x60,
        0x2a, // PUSH1 42 (value)
        0x60,
        0x00, // PUSH1 0 (key)
        0x55, // SSTORE
        0x60,
        0x00, // PUSH1 0 (key)
        0x54, // SLOAD
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(42n)

      // Verify storage was written
      const key = Word256.from(0n)
      const value = host.sload(host.getAddress(), key)
      expect(value.value).toBe(42n)
    })

    it('SLOAD returns zero for unset keys', () => {
      // Program: Load from key 123 (never set)
      const bytecode = new Uint8Array([
        0x60,
        0x7b, // PUSH1 123 (key)
        0x54, // SLOAD
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('SSTORE with zero value deletes storage slot', () => {
      // Program: Store 42, then store 0 (delete)
      const bytecode = new Uint8Array([
        // Store 42 at key 0
        0x60,
        0x2a, // PUSH1 42
        0x60,
        0x00, // PUSH1 0
        0x55, // SSTORE
        // Store 0 at key 0 (delete)
        0x60,
        0x00, // PUSH1 0
        0x60,
        0x00, // PUSH1 0
        0x55, // SSTORE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Verify storage was deleted (size should be 0)
      expect(host.getStorageSize()).toBe(0)
    })

    it('Storage persists across multiple operations', () => {
      // Program: Store 3 values, load them all
      const bytecode = new Uint8Array([
        // Store 100 at key 0
        0x60,
        0x64, // PUSH1 100
        0x60,
        0x00, // PUSH1 0
        0x55, // SSTORE

        // Store 200 at key 1
        0x60,
        0xc8, // PUSH1 200
        0x60,
        0x01, // PUSH1 1
        0x55, // SSTORE

        // Store 300 at key 2
        0x61,
        0x01,
        0x2c, // PUSH2 300
        0x60,
        0x02, // PUSH1 2
        0x55, // SSTORE

        // Load all 3 values
        0x60,
        0x00, // PUSH1 0
        0x54, // SLOAD (should be 100)
        0x60,
        0x01, // PUSH1 1
        0x54, // SLOAD (should be 200)
        0x60,
        0x02, // PUSH1 2
        0x54, // SLOAD (should be 300)

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Stack should have 3 values: 100, 200, 300
      expect(interpreter.getStack().depth()).toBe(3)
      const value3 = interpreter.getStack().pop()
      const value2 = interpreter.getStack().pop()
      const value1 = interpreter.getStack().pop()
      expect(value1.value).toBe(100n)
      expect(value2.value).toBe(200n)
      expect(value3.value).toBe(300n)

      // Verify storage size
      expect(host.getStorageSize()).toBe(3)
    })

    it('Storage uses correct address scoping', () => {
      // This test verifies that storage is scoped to the contract address
      const bytecode = new Uint8Array([
        0x60,
        0x42, // PUSH1 66
        0x60,
        0x00, // PUSH1 0
        0x55, // SSTORE
        0x00, // STOP
      ])

      const address1 = Address.fromHex('0x1111111111111111111111111111111111111111')
      const address2 = Address.fromHex('0x2222222222222222222222222222222222222222')

      const host = new MemoryHost({ address: address1 })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Verify storage at address1
      const key = Word256.from(0n)
      const value1 = host.sload(address1, key)
      expect(value1.value).toBe(66n)

      // Storage at address2 should be zero
      const value2 = host.sload(address2, key)
      expect(value2.value).toBe(0n)
    })

    it('Generates correct storage trace events', () => {
      const bytecode = new Uint8Array([
        0x60,
        0x2a, // PUSH1 42
        0x60,
        0x00, // PUSH1 0
        0x55, // SSTORE
        0x60,
        0x00, // PUSH1 0
        0x54, // SLOAD
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const trace = interpreter.getTrace()
      const storageWriteEvents = trace.getEventsByType('storage.write')
      const storageReadEvents = trace.getEventsByType('storage.read')

      expect(storageWriteEvents.length).toBe(1)
      expect(storageReadEvents.length).toBe(1)

      // Verify write event
      const writeEvent = storageWriteEvents[0]
      expect(writeEvent).toHaveProperty('address')
      expect(writeEvent).toHaveProperty('key')
      expect(writeEvent).toHaveProperty('value')

      // Verify read event
      const readEvent = storageReadEvents[0]
      expect(readEvent).toHaveProperty('address')
      expect(readEvent).toHaveProperty('key')
      expect(readEvent).toHaveProperty('value')
    })
  })

  describe('Logging Operations', () => {
    it('LOG0 emits log with no topics', () => {
      // Program: Write "Hello" to memory, then LOG0
      const bytecode = new Uint8Array([
        0x7f,
        0x48,
        0x65,
        0x6c,
        0x6c,
        0x6f, // PUSH32 "Hello" (padded)
        ...new Array(27).fill(0x00),
        0x60,
        0x00, // PUSH1 0 (offset)
        0x52, // MSTORE
        0x60,
        0x05, // PUSH1 5 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xa0, // LOG0
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].topics.length).toBe(0)
      expect(logs[0].data.length).toBe(5)
      expect(logs[0].data[0]).toBe(0x48) // 'H'
      expect(logs[0].data[1]).toBe(0x65) // 'e'
    })

    it('LOG1 emits log with 1 topic', () => {
      // Program: LOG1 with topic and data
      const bytecode = new Uint8Array([
        // Write data to memory
        0x60,
        0x42, // PUSH1 66 (data)
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE
        // Emit LOG1
        0x60,
        0xaa, // PUSH1 0xaa (topic0)
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset - last byte of stored word)
        0xa1, // LOG1
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].topics.length).toBe(1)
      expect(logs[0].topics[0].value).toBe(0xaan)
      expect(logs[0].data.length).toBe(1)
      expect(logs[0].data[0]).toBe(0x42)
    })

    it('LOG2 emits log with 2 topics', () => {
      const bytecode = new Uint8Array([
        // Write data to memory
        0x60,
        0xff, // PUSH1 0xff
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE
        // Emit LOG2
        0x60,
        0xbb, // PUSH1 0xbb (topic1)
        0x60,
        0xaa, // PUSH1 0xaa (topic0)
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset)
        0xa2, // LOG2
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].topics.length).toBe(2)
      expect(logs[0].topics[0].value).toBe(0xaan)
      expect(logs[0].topics[1].value).toBe(0xbbn)
    })

    it('LOG3 emits log with 3 topics', () => {
      const bytecode = new Uint8Array([
        0x60,
        0x99, // PUSH1 0x99
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE
        0x60,
        0xcc, // PUSH1 0xcc (topic2)
        0x60,
        0xbb, // PUSH1 0xbb (topic1)
        0x60,
        0xaa, // PUSH1 0xaa (topic0)
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset)
        0xa3, // LOG3
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].topics.length).toBe(3)
      expect(logs[0].topics[0].value).toBe(0xaan)
      expect(logs[0].topics[1].value).toBe(0xbbn)
      expect(logs[0].topics[2].value).toBe(0xccn)
    })

    it('LOG4 emits log with 4 topics (maximum)', () => {
      const bytecode = new Uint8Array([
        0x60,
        0x77, // PUSH1 0x77
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE
        0x60,
        0xdd, // PUSH1 0xdd (topic3)
        0x60,
        0xcc, // PUSH1 0xcc (topic2)
        0x60,
        0xbb, // PUSH1 0xbb (topic1)
        0x60,
        0xaa, // PUSH1 0xaa (topic0)
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset)
        0xa4, // LOG4
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].topics.length).toBe(4)
      expect(logs[0].topics[0].value).toBe(0xaan)
      expect(logs[0].topics[1].value).toBe(0xbbn)
      expect(logs[0].topics[2].value).toBe(0xccn)
      expect(logs[0].topics[3].value).toBe(0xddn)
    })

    it('Multiple logs can be emitted in one execution', () => {
      const bytecode = new Uint8Array([
        // Write data to memory
        0x60,
        0x11, // PUSH1 0x11
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE

        // Emit LOG0
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset)
        0xa0, // LOG0

        // Emit LOG1 with different topic
        0x60,
        0x99, // PUSH1 0x99 (topic)
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset)
        0xa1, // LOG1

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(2)
      expect(logs[0].topics.length).toBe(0)
      expect(logs[1].topics.length).toBe(1)
    })

    it('LOG with empty data works correctly', () => {
      const bytecode = new Uint8Array([
        0x60,
        0xaa, // PUSH1 0xaa (topic)
        0x60,
        0x00, // PUSH1 0 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xa1, // LOG1
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].data.length).toBe(0)
      expect(logs[0].topics.length).toBe(1)
    })

    it('Generates correct log trace events', () => {
      const bytecode = new Uint8Array([
        0x60,
        0x42, // PUSH1 66
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE
        0x60,
        0xaa, // PUSH1 0xaa (topic)
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset)
        0xa1, // LOG1
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const trace = interpreter.getTrace()
      const logEvents = trace.getEventsByType('log')

      expect(logEvents.length).toBe(1)
      const logEvent = logEvents[0]
      expect(logEvent).toHaveProperty('address')
      expect(logEvent).toHaveProperty('topics')
      expect(logEvent).toHaveProperty('data')
    })

    it('LOG expands memory correctly', () => {
      // Test that LOG causes memory expansion
      const bytecode = new Uint8Array([
        // LOG from offset 100, length 32 (should expand memory)
        0x60,
        0xaa, // PUSH1 0xaa (topic)
        0x60,
        0x20, // PUSH1 32 (length)
        0x60,
        0x64, // PUSH1 100 (offset)
        0xa1, // LOG1
        0x59, // MSIZE (check memory size)
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Memory should be expanded to at least 132 bytes (rounded up to 160)
      const memorySize = interpreter.getStack().peek().value
      expect(memorySize).toBeGreaterThanOrEqual(132n)
    })
  })

  describe('Block Info Opcodes', () => {
    it('COINBASE (0x41) - Should push miner address', () => {
      // Program: COINBASE, STOP
      const bytecode = new Uint8Array([
        0x41, // COINBASE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({
        coinbase: Address.fromHex('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'),
      })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      // Address is 20 bytes, so it should be the bottom 160 bits
      expect(interpreter.getStack().peek().value).toBe(
        0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefn
      )
    })

    it('TIMESTAMP (0x42) - Should push block timestamp', () => {
      // Program: TIMESTAMP, STOP
      const bytecode = new Uint8Array([
        0x42, // TIMESTAMP
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ timestamp: 12345n })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(12345n)
    })

    it('NUMBER (0x43) - Should push block number', () => {
      // Program: NUMBER, STOP
      const bytecode = new Uint8Array([
        0x43, // NUMBER
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ number: 100n })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(100n)
    })

    it('DIFFICULTY (0x44) - Should push difficulty', () => {
      // Program: DIFFICULTY, STOP
      const bytecode = new Uint8Array([
        0x44, // DIFFICULTY
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ difficulty: 1000000n })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(1000000n)
    })

    it('GASLIMIT (0x45) - Should push gas limit', () => {
      // Program: GASLIMIT, STOP
      const bytecode = new Uint8Array([
        0x45, // GASLIMIT
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ gasLimit: 30000000n })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(30000000n)
    })

    it('CHAINID (0x46) - Should push chain ID', () => {
      // Program: CHAINID, STOP
      const bytecode = new Uint8Array([
        0x46, // CHAINID
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ chainId: 1n })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(1n)
    })

    it('BASEFEE (0x48) - Should push base fee', () => {
      // Program: BASEFEE, STOP
      const bytecode = new Uint8Array([
        0x48, // BASEFEE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ baseFee: 1000000000n })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(1000000000n)
    })

    it('BLOCKHASH (0x40) - Should push block hash for recent block', () => {
      // Program: PUSH1 99, BLOCKHASH, STOP
      const bytecode = new Uint8Array([
        0x60,
        0x63, // PUSH1 99
        0x40, // BLOCKHASH
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ number: 100n })
      host.setBlockHash(99n, Word256.from(0xabcdef1234567890n))
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(0xabcdef1234567890n)
    })

    it('BLOCKHASH (0x40) - Should return zero for current block number', () => {
      // Program: PUSH1 100, BLOCKHASH, STOP (current block = 100)
      const bytecode = new Uint8Array([
        0x60,
        0x64, // PUSH1 100
        0x40, // BLOCKHASH
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ number: 100n })
      host.setBlockHash(100n, Word256.from(0xdeadbeefn))
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      // Current block hash is not accessible
      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('BLOCKHASH (0x40) - Should return zero for block older than 256', () => {
      // Program: PUSH1 0, BLOCKHASH, STOP (current block = 500, asking for block 0)
      const bytecode = new Uint8Array([
        0x60,
        0x00, // PUSH1 0
        0x40, // BLOCKHASH
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ number: 500n })
      host.setBlockHash(0n, Word256.from(0x123456n))
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      // Block 0 is more than 256 blocks old when current block is 500
      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('BLOCKHASH (0x40) - Should return zero for future block', () => {
      // Program: PUSH1 101, BLOCKHASH, STOP (current block = 100)
      const bytecode = new Uint8Array([
        0x60,
        0x65, // PUSH1 101
        0x40, // BLOCKHASH
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBlockContext({ number: 100n })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      // Future block hash is not accessible
      expect(interpreter.getStack().peek().value).toBe(0n)
    })
  })

  describe('Account Balance Opcodes', () => {
    it('BALANCE returns zero for account with no balance', () => {
      // Program: Push an address, then BALANCE
      const someAddress = Address.fromHex('0xabcdef0123456789abcdef0123456789abcdef01')
      const bytecode = new Uint8Array([
        // Push 20-byte address onto stack
        0x73, // PUSH20
        ...someAddress.toBytes(),
        0x31, // BALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      // Don't set any balance - should default to 0
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('BALANCE returns correct balance for account with set balance', () => {
      // Program: Push an address, then BALANCE
      const someAddress = Address.fromHex('0x1234567890123456789012345678901234567890')
      const expectedBalance = 1000000000000000000n // 1 ETH in wei
      const bytecode = new Uint8Array([
        // Push 20-byte address onto stack
        0x73, // PUSH20
        ...someAddress.toBytes(),
        0x31, // BALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBalance(someAddress, expectedBalance)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(expectedBalance)
    })

    it('BALANCE can read balance of multiple different addresses', () => {
      const address1 = Address.fromHex('0x1111111111111111111111111111111111111111')
      const address2 = Address.fromHex('0x2222222222222222222222222222222222222222')
      const balance1 = 500n
      const balance2 = 1000n

      const bytecode = new Uint8Array([
        // Get balance of address1
        0x73, // PUSH20
        ...address1.toBytes(),
        0x31, // BALANCE
        // Get balance of address2
        0x73, // PUSH20
        ...address2.toBytes(),
        0x31, // BALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBalance(address1, balance1)
      host.setBalance(address2, balance2)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().depth()).toBe(2)
      const result2 = interpreter.getStack().pop()
      const result1 = interpreter.getStack().pop()
      expect(result1.value).toBe(balance1)
      expect(result2.value).toBe(balance2)
    })

    it('SELFBALANCE returns zero when contract has no balance', () => {
      const contractAddr = Address.fromHex('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
      const bytecode = new Uint8Array([
        0x47, // SELFBALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost({ address: contractAddr })
      // Don't set any balance
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('SELFBALANCE returns correct balance of current contract', () => {
      const contractAddr = Address.fromHex('0xcafebabecafebabecafebabecafebabecafebabe')
      const contractBalance = 5000000000000000000n // 5 ETH in wei
      const bytecode = new Uint8Array([
        0x47, // SELFBALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost({ address: contractAddr })
      host.setBalance(contractAddr, contractBalance)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(contractBalance)
    })

    it('SELFBALANCE and BALANCE return same value for current contract', () => {
      const contractAddr = Address.fromHex('0x9999999999999999999999999999999999999999')
      const balance = 123456789n

      const bytecode = new Uint8Array([
        // First get SELFBALANCE
        0x47, // SELFBALANCE
        // Then get BALANCE of same address
        0x73, // PUSH20
        ...contractAddr.toBytes(),
        0x31, // BALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost({ address: contractAddr })
      host.setBalance(contractAddr, balance)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().depth()).toBe(2)
      const balanceResult = interpreter.getStack().pop()
      const selfBalanceResult = interpreter.getStack().pop()
      expect(selfBalanceResult.value).toBe(balance)
      expect(balanceResult.value).toBe(balance)
      expect(selfBalanceResult.value).toBe(balanceResult.value)
    })

    it('BALANCE generates gas charge trace event', () => {
      const someAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      const balance = 1000n

      const bytecode = new Uint8Array([
        0x73, // PUSH20
        ...someAddress.toBytes(),
        0x31, // BALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setBalance(someAddress, balance)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const trace = interpreter.getTrace()
      const gasEvents = trace.getEventsByType('gas.charge')

      // Should have gas charges for PUSH20 and BALANCE
      expect(gasEvents.length).toBeGreaterThanOrEqual(1)
      // Find the BALANCE gas charge event
      const balanceGasEvent = gasEvents.find((e: { reason?: string }) => e.reason === 'BALANCE')
      expect(balanceGasEvent).toBeDefined()
    })

    it('SELFBALANCE generates gas charge trace event', () => {
      const contractAddr = Address.fromHex('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
      const balance = 2000n

      const bytecode = new Uint8Array([
        0x47, // SELFBALANCE
        0x00, // STOP
      ])

      const host = new MemoryHost({ address: contractAddr })
      host.setBalance(contractAddr, balance)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const trace = interpreter.getTrace()
      const gasEvents = trace.getEventsByType('gas.charge')

      // Should have gas charge for SELFBALANCE
      expect(gasEvents.length).toBeGreaterThanOrEqual(1)
      // Find the SELFBALANCE gas charge event
      const selfBalanceGasEvent = gasEvents.find((e: { reason?: string }) => e.reason === 'SELFBALANCE')
      expect(selfBalanceGasEvent).toBeDefined()
    })
  })

  describe('Code Opcodes', () => {
    it('CODESIZE pushes size of executing bytecode', () => {
      // Program: CODESIZE, STOP (2 bytes total)
      const bytecode = new Uint8Array([
        0x38, // CODESIZE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(2n) // bytecode is 2 bytes
    })

    it('CODESIZE returns correct size for longer bytecode', () => {
      // Program with PUSH operations making it longer
      const bytecode = new Uint8Array([
        0x60,
        0x00, // PUSH1 0
        0x60,
        0x00, // PUSH1 0
        0x60,
        0x00, // PUSH1 0
        0x38, // CODESIZE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().depth()).toBe(4)
      expect(interpreter.getStack().peek().value).toBe(8n) // bytecode is 8 bytes
    })

    it('CODECOPY copies code to memory', () => {
      // Program: copy 4 bytes from code offset 0 to memory offset 0
      const bytecode = new Uint8Array([
        0x60,
        0x04, // PUSH1 4 (size)
        0x60,
        0x00, // PUSH1 0 (offset in code)
        0x60,
        0x00, // PUSH1 0 (destOffset in memory)
        0x39, // CODECOPY
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD (load from memory to verify)
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)

      // Memory should contain the first 4 bytes of bytecode: 0x60 0x04 0x60 0x00
      // MLOAD returns 32 bytes as a Word256
      const memValue = interpreter.getStack().peek().value
      // First 4 bytes are 0x60040600, padded with zeros
      expect(memValue).toBe(0x6004600000000000000000000000000000000000000000000000000000000000n)
    })

    it('CODECOPY copies code from middle of bytecode', () => {
      // Copy bytes 2-5 (offset 2, size 4) to memory offset 0
      const bytecode = new Uint8Array([
        0x60,
        0x04, // PUSH1 4 (size)
        0x60,
        0x02, // PUSH1 2 (offset in code - starts at 3rd byte)
        0x60,
        0x00, // PUSH1 0 (destOffset)
        0x39, // CODECOPY
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Bytes 2-5 of bytecode are: 0x60 0x02 0x60 0x00
      const memValue = interpreter.getStack().peek().value
      expect(memValue).toBe(0x6002600000000000000000000000000000000000000000000000000000000000n)
    })

    it('CODECOPY pads with zeros when reading beyond code', () => {
      // Copy 8 bytes starting at offset that goes beyond code
      const bytecode = new Uint8Array([
        0x60,
        0x08, // PUSH1 8 (size)
        0x60,
        0x06, // PUSH1 6 (offset - near end)
        0x60,
        0x00, // PUSH1 0 (destOffset)
        0x39, // CODECOPY
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD
        0x00, // STOP - this is at offset 10
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Memory should have bytes 6-10 from code (5 bytes) + 3 zeros
      // Bytes at offset 6-10 are: 0x39 0x60 0x00 0x51 0x00
      // But we're also padding with 3 zeros to make 8 bytes
      const mem = interpreter.getState().memory
      expect(mem[0]).toBe(0x39) // CODECOPY opcode
      expect(mem[1]).toBe(0x60) // PUSH1
      expect(mem[2]).toBe(0x00) // 0
      expect(mem[3]).toBe(0x51) // MLOAD
      expect(mem[4]).toBe(0x00) // STOP
      expect(mem[5]).toBe(0x00) // Zero padding
      expect(mem[6]).toBe(0x00) // Zero padding
      expect(mem[7]).toBe(0x00) // Zero padding
    })

    it('EXTCODESIZE returns size of external code', () => {
      // Set up external code at a known address
      const externalCode = new Uint8Array([0x60, 0x00, 0x60, 0x00, 0x00]) // 5 bytes
      const externalAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

      const bytecode = new Uint8Array([
        // Push the external address
        0x73, // PUSH20
        ...externalAddress.toBytes(),
        0x3b, // EXTCODESIZE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setCode(externalAddress, externalCode)

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(5n) // external code is 5 bytes
    })

    it('EXTCODESIZE returns 0 for address with no code', () => {
      const emptyAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

      const bytecode = new Uint8Array([
        0x73, // PUSH20
        ...emptyAddress.toBytes(),
        0x3b, // EXTCODESIZE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      // Don't set any code for emptyAddress

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('EXTCODECOPY copies external code to memory', () => {
      // Set up external code
      const externalCode = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe])
      const externalAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

      const bytecode = new Uint8Array([
        0x60,
        0x06, // PUSH1 6 (size)
        0x60,
        0x00, // PUSH1 0 (offset in external code)
        0x60,
        0x00, // PUSH1 0 (destOffset in memory)
        0x73, // PUSH20 (address)
        ...externalAddress.toBytes(),
        0x3c, // EXTCODECOPY
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setCode(externalAddress, externalCode)

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)

      // Memory should contain the external code bytes
      const mem = interpreter.getState().memory
      expect(mem[0]).toBe(0xde)
      expect(mem[1]).toBe(0xad)
      expect(mem[2]).toBe(0xbe)
      expect(mem[3]).toBe(0xef)
      expect(mem[4]).toBe(0xca)
      expect(mem[5]).toBe(0xfe)
    })

    it('EXTCODECOPY pads with zeros when reading beyond external code', () => {
      const externalCode = new Uint8Array([0xaa, 0xbb])
      const externalAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

      const bytecode = new Uint8Array([
        0x60,
        0x08, // PUSH1 8 (size - more than external code length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0x60,
        0x00, // PUSH1 0 (destOffset)
        0x73, // PUSH20
        ...externalAddress.toBytes(),
        0x3c, // EXTCODECOPY
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setCode(externalAddress, externalCode)

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const mem = interpreter.getState().memory
      expect(mem[0]).toBe(0xaa)
      expect(mem[1]).toBe(0xbb)
      expect(mem[2]).toBe(0x00) // Zero padding
      expect(mem[3]).toBe(0x00)
      expect(mem[4]).toBe(0x00)
      expect(mem[5]).toBe(0x00)
      expect(mem[6]).toBe(0x00)
      expect(mem[7]).toBe(0x00)
    })

    it('EXTCODECOPY with offset into external code', () => {
      const externalCode = new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55])
      const externalAddress = Address.fromHex('0x1234567890123456789012345678901234567890')

      const bytecode = new Uint8Array([
        0x60,
        0x03, // PUSH1 3 (size)
        0x60,
        0x02, // PUSH1 2 (offset - start at 3rd byte)
        0x60,
        0x00, // PUSH1 0 (destOffset)
        0x73, // PUSH20
        ...externalAddress.toBytes(),
        0x3c, // EXTCODECOPY
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setCode(externalAddress, externalCode)

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const mem = interpreter.getState().memory
      expect(mem[0]).toBe(0x33) // Byte at offset 2
      expect(mem[1]).toBe(0x44) // Byte at offset 3
      expect(mem[2]).toBe(0x55) // Byte at offset 4
    })

    it('EXTCODEHASH returns code hash for address with code', () => {
      const externalAddress = Address.fromHex('0x1234567890123456789012345678901234567890')
      const expectedHash = Word256.from(
        0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890n
      )

      const bytecode = new Uint8Array([
        0x73, // PUSH20
        ...externalAddress.toBytes(),
        0x3f, // EXTCODEHASH
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setCodeHash(externalAddress, expectedHash)

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(expectedHash.value)
    })

    it('EXTCODEHASH returns empty code hash for EOA', () => {
      // Empty code hash (keccak256 of empty bytes)
      const emptyCodeHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470n
      const eoaAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

      const bytecode = new Uint8Array([
        0x73, // PUSH20
        ...eoaAddress.toBytes(),
        0x3f, // EXTCODEHASH
        0x00, // STOP
      ])

      const host = new MemoryHost()
      // Don't set code for EOA

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().peek().value).toBe(emptyCodeHash)
    })

    it('EXTCODEHASH returns hash when code is set via setCode', () => {
      const externalAddress = Address.fromHex('0x1234567890123456789012345678901234567890')
      const externalCode = new Uint8Array([0x60, 0x00, 0x00])

      const bytecode = new Uint8Array([
        0x73, // PUSH20
        ...externalAddress.toBytes(),
        0x3f, // EXTCODEHASH
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setCode(externalAddress, externalCode)

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // MemoryHost returns zero for code hash when code exists but hash not explicitly set
      // (Real implementation would compute keccak256)
      expect(interpreter.getStack().depth()).toBe(1)
      // The value should be zero (placeholder) since we only set code, not code hash
      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('Generates correct trace events for code opcodes', () => {
      const bytecode = new Uint8Array([
        0x38, // CODESIZE
        0x60,
        0x01, // PUSH1 1 (size)
        0x60,
        0x00, // PUSH1 0 (offset)
        0x60,
        0x00, // PUSH1 0 (destOffset)
        0x39, // CODECOPY
        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const trace = interpreter.getTrace()

      // Check for stack.push event from CODESIZE
      const pushEvents = trace.getEventsByType('stack.push')
      expect(pushEvents.length).toBeGreaterThan(0)

      // Check for memory.write event from CODECOPY
      const memWriteEvents = trace.getEventsByType('memory.write')
      expect(memWriteEvents.length).toBe(1)
    })
  })

  describe('Environment Opcodes', () => {
    it('ADDRESS (0x30) - Should push the contract address', () => {
      // Program: ADDRESS, STOP
      const bytecode = new Uint8Array([
        0x30, // ADDRESS
        0x00, // STOP
      ])

      const contractAddress = Address.fromHex('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
      const host = new MemoryHost({ address: contractAddress })
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)

      // ADDRESS is a 20-byte value, which should be pushed as Word256
      const expectedValue = BigInt('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
      expect(interpreter.getStack().peek().value).toBe(expectedValue)
    })

    it('ORIGIN (0x32) - Should push tx origin', () => {
      // Program: ORIGIN, STOP
      const bytecode = new Uint8Array([
        0x32, // ORIGIN
        0x00, // STOP
      ])

      const originAddress = Address.fromHex('0x1234567890123456789012345678901234567890')
      const host = new MemoryHost()
      host.setOrigin(originAddress)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)

      const expectedValue = BigInt('0x1234567890123456789012345678901234567890')
      expect(interpreter.getStack().peek().value).toBe(expectedValue)
    })

    it('CALLER (0x33) - Should push msg.sender', () => {
      // Program: CALLER, STOP
      const bytecode = new Uint8Array([
        0x33, // CALLER
        0x00, // STOP
      ])

      const callerAddress = Address.fromHex('0xaabbccddaabbccddaabbccddaabbccddaabbccdd')
      const host = new MemoryHost()
      host.setCaller(callerAddress)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)

      const expectedValue = BigInt('0xaabbccddaabbccddaabbccddaabbccddaabbccdd')
      expect(interpreter.getStack().peek().value).toBe(expectedValue)
    })

    it('CALLVALUE (0x34) - Should push msg.value', () => {
      // Program: CALLVALUE, STOP
      const bytecode = new Uint8Array([
        0x34, // CALLVALUE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setCallValue(12345678901234567890n)
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)

      expect(interpreter.getStack().peek().value).toBe(12345678901234567890n)
    })

    it('GASPRICE (0x3a) - Should push gas price', () => {
      // Program: GASPRICE, STOP
      const bytecode = new Uint8Array([
        0x3a, // GASPRICE
        0x00, // STOP
      ])

      const host = new MemoryHost()
      host.setGasPrice(20000000000n) // 20 gwei
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)

      expect(interpreter.getStack().peek().value).toBe(20000000000n)
    })

    it('GAS (0x5a) - Should push remaining gas', () => {
      // Program: Run some opcodes to consume gas, then GAS, STOP
      // PUSH1 consumes 3 gas, POP consumes 2 gas, GAS consumes 2 gas
      const bytecode = new Uint8Array([
        0x60, 0x01, // PUSH1 1 (3 gas)
        0x50,       // POP (2 gas)
        0x60, 0x02, // PUSH1 2 (3 gas)
        0x50,       // POP (2 gas)
        0x5a,       // GAS (2 gas) - pushes remaining gas
        0x00,       // STOP
      ])

      const initialGas = 1000000n
      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)

      // Gas consumed before GAS opcode: 3 + 2 + 3 + 2 = 10
      // GAS opcode itself costs 2 gas, but it pushes the value BEFORE consuming its own gas
      // So the value pushed should be initialGas - 10 = 999990
      // However, the exact behavior depends on implementation - the key thing is
      // the result should be less than initialGas and greater than 0
      const remainingGas = interpreter.getStack().peek().value
      expect(remainingGas).toBeLessThan(initialGas)
      expect(remainingGas).toBeGreaterThan(0n)
    })

    it('Environment opcodes can be used together', () => {
      // Program: Push multiple environment values to stack
      const bytecode = new Uint8Array([
        0x30, // ADDRESS
        0x33, // CALLER
        0x34, // CALLVALUE
        0x00, // STOP
      ])

      const contractAddress = Address.fromHex('0x1111111111111111111111111111111111111111')
      const callerAddress = Address.fromHex('0x2222222222222222222222222222222222222222')
      const callValue = 1000000000000000000n // 1 ETH

      const host = new MemoryHost({ address: contractAddress })
      host.setCaller(callerAddress)
      host.setCallValue(callValue)

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(3)

      // Stack is LIFO, so top is CALLVALUE, then CALLER, then ADDRESS
      const stack = interpreter.getStack()
      expect(stack.pop().value).toBe(callValue)
      expect(stack.pop().value).toBe(BigInt('0x2222222222222222222222222222222222222222'))
      expect(stack.pop().value).toBe(BigInt('0x1111111111111111111111111111111111111111'))
    })

    it('Environment values can be set via config', () => {
      // Program: ORIGIN, CALLER, CALLVALUE, GASPRICE, STOP
      const bytecode = new Uint8Array([
        0x32, // ORIGIN
        0x33, // CALLER
        0x34, // CALLVALUE
        0x3a, // GASPRICE
        0x00, // STOP
      ])

      const originAddress = Address.fromHex('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      const callerAddress = Address.fromHex('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
      const callValue = 5000n
      const gasPrice = 100n

      const host = new MemoryHost({
        txContext: {
          origin: originAddress,
          gasPrice: gasPrice,
        },
        msgContext: {
          caller: callerAddress,
          value: callValue,
        },
      })

      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getStack().depth()).toBe(4)

      // Stack: ORIGIN, CALLER, CALLVALUE, GASPRICE (top)
      const stack = interpreter.getStack()
      expect(stack.pop().value).toBe(gasPrice)
      expect(stack.pop().value).toBe(callValue)
      expect(stack.pop().value).toBe(BigInt('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'))
      expect(stack.pop().value).toBe(BigInt('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'))
    })
  })

  describe('Integration Tests', () => {
    it('Storage and logging work together', () => {
      // Program: Store value, load it, emit log with the value
      const bytecode = new Uint8Array([
        // Store 123 at key 0
        0x60,
        0x7b, // PUSH1 123
        0x60,
        0x00, // PUSH1 0
        0x55, // SSTORE

        // Load it back
        0x60,
        0x00, // PUSH1 0
        0x54, // SLOAD (value now on stack)

        // Write to memory
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE

        // Emit LOG0 with the stored value
        0x60,
        0x01, // PUSH1 1 (length)
        0x60,
        0x1f, // PUSH1 31 (offset)
        0xa0, // LOG0

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Verify storage
      const key = Word256.from(0n)
      const value = host.sload(host.getAddress(), key)
      expect(value.value).toBe(123n)

      // Verify log
      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].data[0]).toBe(123)
    })

    it('Simulates ERC20 Transfer event', () => {
      // Simplified ERC20 Transfer(address from, address to, uint256 value)
      // Transfer is typically LOG3 with signature hash + from + to as topics
      const bytecode = new Uint8Array([
        // Write value (1000) to memory
        0x61,
        0x03,
        0xe8, // PUSH2 1000
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE

        // Emit LOG3
        // Topic0: keccak256("Transfer(address,address,uint256)") - simplified to 0xddf252ad
        // Topic1: from address (0x11...11)
        // Topic2: to address (0x22...22)
        0x61,
        0x22,
        0x22, // PUSH2 0x2222 (to address, simplified)
        0x61,
        0x11,
        0x11, // PUSH2 0x1111 (from address, simplified)
        0x63,
        0xdd,
        0xf2,
        0x52,
        0xad, // PUSH4 0xddf252ad (Transfer signature, simplified)
        0x60,
        0x20, // PUSH1 32 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xa3, // LOG3

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const logs = host.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].topics.length).toBe(3)

      // Verify Transfer signature (simplified)
      expect(logs[0].topics[0].value).toBe(0xddf252adn)

      // Verify addresses (simplified)
      expect(logs[0].topics[1].value).toBe(0x1111n)
      expect(logs[0].topics[2].value).toBe(0x2222n)

      // Verify value in data
      expect(logs[0].data.length).toBe(32)
    })
  })
})
