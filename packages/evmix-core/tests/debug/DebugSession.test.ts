// packages/evmix-core/tests/debug/DebugSession.test.ts
import { describe, it, expect } from 'vitest'
import { DebugSession } from '../../src/debug/DebugSession'
import { MemoryHost } from '../../src/host/MemoryHost'

describe('DebugSession', () => {
  describe('stepping', () => {
    it('step() executes one opcode and returns result', () => {
      // PUSH1 5, PUSH1 3, ADD, STOP
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      const result1 = session.step()
      expect(result1.executed).toBe(true)
      expect(result1.opcodeName).toBe('PUSH1')
      expect(result1.halted).toBe(false)
      expect(session.getCurrentStep()).toBe(1)
    })

    it('step() returns executed:false when halted', () => {
      const bytecode = new Uint8Array([0x00]) // STOP
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.step() // Execute STOP
      const result = session.step() // Try to step again

      expect(result.executed).toBe(false)
      expect(result.halted).toBe(true)
    })

    it('run() executes until halted', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.run()

      expect(session.isHalted()).toBe(true)
      expect(session.getCurrentStep()).toBe(4) // 4 opcodes executed
    })
  })

  describe('state access', () => {
    it('getSnapshot() returns current state', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x00]) // PUSH1 5, STOP
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.step() // PUSH1 5
      const snapshot = session.getSnapshot()

      expect(snapshot.stepIndex).toBe(1)
      expect(snapshot.stack.length).toBe(1)
      expect(snapshot.stack[0].value).toBe(5n)
    })
  })
})
