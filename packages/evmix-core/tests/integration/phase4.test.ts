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

      const host = new MemoryHost(address1)
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
