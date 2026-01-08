import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { HaltReason } from '../../src/state/HaltReason'
import { MemoryHost } from '../../src/host/MemoryHost'

describe('Phase 3 Integration Tests - Memory & Data', () => {
  describe('Memory Operations', () => {
    it('MSTORE and MLOAD work correctly', () => {
      // Store 42 at memory offset 0, then load it
      const bytecode = new Uint8Array([
        0x60,
        0x2a, // PUSH1 42 (value to store)
        0x60,
        0x00, // PUSH1 0 (offset)
        0x52, // MSTORE

        0x60,
        0x00, // PUSH1 0 (offset to load from)
        0x51, // MLOAD

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
      expect(interpreter.getStack().depth()).toBe(1)
      expect(interpreter.getStack().peek().value).toBe(42n)
    })

    it('MSTORE8 stores a single byte', () => {
      // Store byte 0xFF at offset 0, then load the word
      const bytecode = new Uint8Array([
        0x60,
        0xff, // PUSH1 255 (value to store)
        0x60,
        0x00, // PUSH1 0 (offset)
        0x53, // MSTORE8

        0x60,
        0x00, // PUSH1 0 (offset to load from)
        0x51, // MLOAD (loads 32 bytes)

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Should get 0xFF followed by 31 zero bytes
      // 0xFF00000000000000000000000000000000000000000000000000000000000000
      expect(interpreter.getStack().peek().value).toBe(0xff00000000000000000000000000000000000000000000000000000000000000n)
    })

    it('MSIZE returns current memory size', () => {
      // Check initial size, store something, check size again
      const bytecode = new Uint8Array([
        0x59, // MSIZE (should be 0)

        0x60,
        0x42, // PUSH1 66
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE (expands to 32 bytes)

        0x59, // MSIZE (should be 32)

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().depth()).toBe(2)
      const size2 = interpreter.getStack().pop()
      const size1 = interpreter.getStack().pop()

      expect(size1.value).toBe(0n) // Initial size
      expect(size2.value).toBe(32n) // After MSTORE
    })

    it('Memory expansion costs gas', () => {
      const bytecode = new Uint8Array([
        0x60,
        0xff, // PUSH1 255
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE at offset 0 (expands to 32 bytes)

        0x60,
        0xaa, // PUSH1 170
        0x60,
        0x40, // PUSH1 64
        0x52, // MSTORE at offset 64 (expands to 96 bytes)

        0x00, // STOP
      ])

      const initialGas = 100000n
      const interpreter = new Interpreter({ bytecode, initialGas })
      interpreter.run()

      // Check that gas was charged for expansion
      const gasUsed = initialGas - interpreter.getState().gasRemaining
      expect(gasUsed > 10n).toBe(true) // Should cost more than just opcodes
    })

    it('MSTORE and MLOAD at non-zero offsets', () => {
      // Store at offset 64
      const bytecode = new Uint8Array([
        0x60,
        0x7b, // PUSH1 123
        0x60,
        0x40, // PUSH1 64 (offset)
        0x52, // MSTORE

        0x60,
        0x40, // PUSH1 64 (offset)
        0x51, // MLOAD

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().peek().value).toBe(123n)
    })
  })

  describe('Calldata Operations', () => {
    it('CALLDATASIZE returns calldata length', () => {
      const bytecode = new Uint8Array([
        0x36, // CALLDATASIZE
        0x00, // STOP
      ])

      const calldata = new Uint8Array([1, 2, 3, 4, 5])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().peek().value).toBe(5n)
    })

    it('CALLDATALOAD loads 32 bytes from calldata', () => {
      const bytecode = new Uint8Array([
        0x60,
        0x00, // PUSH1 0 (offset)
        0x35, // CALLDATALOAD

        0x00, // STOP
      ])

      // Calldata: first 4 bytes are 0x01020304, rest zeros
      const calldata = new Uint8Array([0x01, 0x02, 0x03, 0x04])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n, host })
      interpreter.run()

      // Should get 0x01020304 followed by 28 zero bytes
      expect(interpreter.getStack().peek().value).toBe(0x0102030400000000000000000000000000000000000000000000000000000000n)
    })

    it('CALLDATALOAD with offset beyond calldata pads with zeros', () => {
      const bytecode = new Uint8Array([
        0x60,
        0x10, // PUSH1 16 (offset beyond calldata)
        0x35, // CALLDATALOAD

        0x00, // STOP
      ])

      const calldata = new Uint8Array([0xff, 0xff])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n, host })
      interpreter.run()

      // All zeros (reading beyond calldata)
      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('CALLDATACOPY copies calldata to memory', () => {
      const bytecode = new Uint8Array([
        // CALLDATACOPY(destOffset=0, offset=0, length=4)
        0x60,
        0x04, // PUSH1 4 (length)
        0x60,
        0x00, // PUSH1 0 (source offset in calldata)
        0x60,
        0x00, // PUSH1 0 (dest offset in memory)
        0x37, // CALLDATACOPY

        // Load from memory to verify
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD

        0x00, // STOP
      ])

      const calldata = new Uint8Array([0xde, 0xad, 0xbe, 0xef])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n, host })
      interpreter.run()

      // Should get 0xdeadbeef followed by 28 zero bytes
      expect(interpreter.getStack().peek().value).toBe(0xdeadbeef00000000000000000000000000000000000000000000000000000000n)
    })

    it.skip('CALLDATACOPY with partial calldata pads with zeros', () => {
      const bytecode = new Uint8Array([
        // Copy 8 bytes but calldata only has 4
        0x60,
        0x08, // PUSH1 8 (length - more than calldata)
        0x60,
        0x00, // PUSH1 0 (source offset)
        0x60,
        0x00, // PUSH1 0 (dest offset)
        0x37, // CALLDATACOPY

        // Load first word from memory
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD

        0x00, // STOP
      ])

      const calldata = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n, host })
      interpreter.run()

      // Should get 0xaabbccdd followed by 28 zero bytes (4 from calldata + 4 padding zeros + 24 more)
      expect(interpreter.getStack().peek().value).toBe(0xaabbccdd0000000000000000000000000000000000000000000000000000000n)
    })
  })

  describe('Return Operations', () => {
    it('RETURN halts with return data from memory', () => {
      const bytecode = new Uint8Array([
        // Store value in memory
        0x60,
        0x42, // PUSH1 66
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE

        // RETURN(offset=0, length=32)
        0x60,
        0x20, // PUSH1 32 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xf3, // RETURN
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.RETURN)

      // Check return data
      const returnData = interpreter.getState().returnData
      expect(returnData.length).toBe(32)

      // Convert return data to bigint
      let value = 0n
      for (let i = 0; i < returnData.length; i++) {
        value = (value << 8n) | BigInt(returnData[i])
      }
      expect(value).toBe(66n)
    })

    it('REVERT halts with revert reason from memory', () => {
      const bytecode = new Uint8Array([
        // Store error message in memory
        0x60,
        0xff, // PUSH1 255 (some error code)
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE

        // REVERT(offset=0, length=32)
        0x60,
        0x20, // PUSH1 32 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xfd, // REVERT
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.isHalted()).toBe(true)
      expect(interpreter.getHaltReason()).toBe(HaltReason.REVERT)

      // Check return data (revert reason)
      const returnData = interpreter.getState().returnData
      expect(returnData.length).toBe(32)

      let value = 0n
      for (let i = 0; i < returnData.length; i++) {
        value = (value << 8n) | BigInt(returnData[i])
      }
      expect(value).toBe(255n)
    })

    it('RETURN with zero length', () => {
      const bytecode = new Uint8Array([
        // RETURN(offset=0, length=0)
        0x60,
        0x00, // PUSH1 0 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xf3, // RETURN
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getHaltReason()).toBe(HaltReason.RETURN)
      expect(interpreter.getState().returnData.length).toBe(0)
    })
  })

  describe('Integration Scenarios', () => {
    it('Copy calldata to memory, modify it, and return', () => {
      const bytecode = new Uint8Array([
        // Copy calldata to memory
        0x36, // CALLDATASIZE
        0x60,
        0x00, // PUSH1 0 (source offset)
        0x60,
        0x00, // PUSH1 0 (dest offset)
        0x37, // CALLDATACOPY

        // Modify first byte in memory
        0x60,
        0xff, // PUSH1 255
        0x60,
        0x00, // PUSH1 0
        0x53, // MSTORE8

        // Return modified data
        0x36, // CALLDATASIZE
        0x60,
        0x00, // PUSH1 0
        0xf3, // RETURN
      ])

      const calldata = new Uint8Array([0x00, 0x11, 0x22, 0x33])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getHaltReason()).toBe(HaltReason.RETURN)

      // First byte should be 0xFF, rest unchanged
      const returnData = interpreter.getState().returnData
      expect(returnData[0]).toBe(0xff)
      expect(returnData[1]).toBe(0x11)
      expect(returnData[2]).toBe(0x22)
      expect(returnData[3]).toBe(0x33)
    })

    it('Use memory as working space for computation', () => {
      const bytecode = new Uint8Array([
        // Store 10 at offset 0
        0x60,
        0x0a, // PUSH1 10
        0x60,
        0x00, // PUSH1 0
        0x52, // MSTORE

        // Store 20 at offset 32
        0x60,
        0x14, // PUSH1 20
        0x60,
        0x20, // PUSH1 32
        0x52, // MSTORE

        // Load both values
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD (load 10)

        0x60,
        0x20, // PUSH1 32
        0x51, // MLOAD (load 20)

        // Add them
        0x01, // ADD (10 + 20 = 30)

        // Store result at offset 64
        0x60,
        0x40, // PUSH1 64
        0x52, // MSTORE

        // Return result
        0x60,
        0x20, // PUSH1 32 (length)
        0x60,
        0x40, // PUSH1 64 (offset)
        0xf3, // RETURN
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      const returnData = interpreter.getState().returnData
      let value = 0n
      for (let i = 0; i < returnData.length; i++) {
        value = (value << 8n) | BigInt(returnData[i])
      }
      expect(value).toBe(30n)
    })

    it.skip('Conditional revert based on calldata', () => {
      const bytecode = new Uint8Array([
        // Load first byte of calldata
        0x60,
        0x00, // PUSH1 0
        0x35, // CALLDATALOAD

        // Check if it's zero
        0x15, // ISZERO

        // If not zero, jump to success
        0x60,
        0x10, // PUSH1 16 (success label)
        0x57, // JUMPI

        // Revert path
        0x60,
        0x00, // PUSH1 0 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xfd, // REVERT

        // Success path (at position 16)
        0x5b, // JUMPDEST
        0x60,
        0x00, // PUSH1 0 (length)
        0x60,
        0x00, // PUSH1 0 (offset)
        0xf3, // RETURN
      ])

      // Test with zero calldata - should revert
      const calldata1 = new Uint8Array(32) // All zeros
      const host1 = new MemoryHost()
      const interpreter1 = new Interpreter({ bytecode, calldata: calldata1, initialGas: 1000000n, host: host1 })
      interpreter1.run()
      expect(interpreter1.getHaltReason()).toBe(HaltReason.REVERT)

      // Test with non-zero calldata - should return
      const calldata2 = new Uint8Array(32)
      calldata2[0] = 0x01
      const host2 = new MemoryHost()
      const interpreter2 = new Interpreter({ bytecode, calldata: calldata2, initialGas: 1000000n, host: host2 })
      interpreter2.run()
      expect(interpreter2.getHaltReason()).toBe(HaltReason.RETURN)
    })
  })

  describe('Edge Cases', () => {
    it('MLOAD from uninitialized memory returns zeros', () => {
      const bytecode = new Uint8Array([
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().peek().value).toBe(0n)
    })

    it('Multiple MSTORE8 operations to same byte', () => {
      const bytecode = new Uint8Array([
        // Store 0xFF
        0x60,
        0xff, // PUSH1 255
        0x60,
        0x00, // PUSH1 0
        0x53, // MSTORE8

        // Store 0xAA at same location
        0x60,
        0xaa, // PUSH1 170
        0x60,
        0x00, // PUSH1 0
        0x53, // MSTORE8

        // Load and check
        0x60,
        0x00, // PUSH1 0
        0x51, // MLOAD

        0x00, // STOP
      ])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
      interpreter.run()

      // Should be 0xAA (second write overwrites first)
      expect(interpreter.getStack().peek().value).toBe(0xaa00000000000000000000000000000000000000000000000000000000000000n)
    })

    it('CALLDATALOAD at various offsets', () => {
      const bytecode = new Uint8Array([
        // Load from offset 0
        0x60,
        0x00, // PUSH1 0
        0x35, // CALLDATALOAD

        // Load from offset 1 (should shift by one byte)
        0x60,
        0x01, // PUSH1 1
        0x35, // CALLDATALOAD

        0x00, // STOP
      ])

      const calldata = new Uint8Array([0x01, 0x02, 0x03, 0x04])

      const host = new MemoryHost()
      const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n, host })
      interpreter.run()

      expect(interpreter.getStack().depth()).toBe(2)
      const load2 = interpreter.getStack().pop()
      const load1 = interpreter.getStack().pop()

      // Load 1 should be 0x01020304... (starts at byte 0)
      expect(load1.value).toBe(0x0102030400000000000000000000000000000000000000000000000000000000n)

      // Load 2 should be 0x02030400... (starts at byte 1)
      expect(load2.value).toBe(0x0203040000000000000000000000000000000000000000000000000000000000n)
    })
  })
})
