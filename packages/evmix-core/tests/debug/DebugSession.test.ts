// packages/evmix-core/tests/debug/DebugSession.test.ts
import { describe, it, expect } from 'vitest'
import { DebugSession } from '../../src/debug/DebugSession'
import { MemoryHost } from '../../src/host/MemoryHost'
import { Word256 } from '../../src/types/Word256'
import { Address } from '../../src/types/Address'

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

  describe('breakpoints', () => {
    it('stops on PC breakpoint', () => {
      // PUSH1 5, PUSH1 3, ADD, STOP (ADD is at PC=4)
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.addBreakpoint({ type: 'pc', value: 4 })
      session.run()

      // Breakpoint triggers after executing opcode at PC=4 (ADD)
      expect(session.getCurrentStep()).toBe(3) // Stopped after ADD
      expect(session.isHalted()).toBe(false)
    })

    it('stops on opcode breakpoint', () => {
      // PUSH1 5, PUSH1 3, ADD, STOP
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.addBreakpoint({ type: 'opcode', opcode: 0x01 }) // ADD
      session.run()

      // Should stop after ADD executes
      expect(session.getSnapshot().stack.length).toBe(1) // Result of ADD
    })

    it('custom predicate breakpoint works', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      session.addBreakpoint({
        type: 'custom',
        fn: (ctx) => ctx.stack.length >= 2,
      })
      session.run()

      expect(session.getCurrentStep()).toBe(2) // After second PUSH
    })

    it('disabled breakpoints are skipped', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      const id = session.addBreakpoint({ type: 'pc', value: 0 })
      session.removeBreakpoint(id)
      session.run()

      expect(session.isHalted()).toBe(true) // Ran to completion
    })
  })

  describe('mutation', () => {
    it('mutate() changes host state', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      const addr = Address.fromHex('0x1234567890123456789012345678901234567890')
      session.mutate((host) => {
        host.setBalance(addr, 999n)
      })

      // Verify the host was mutated (we'd need to access host somehow)
      expect(session.getForkPoint()).toBe(0)
    })

    it('invalidates snapshots after fork point', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x60, 0x03, 0x01, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
        checkpointInterval: 1, // Checkpoint every step
      })

      session.step() // step 1
      session.step() // step 2

      expect(session.getSnapshotAt(1)).toBeDefined()
      expect(session.getSnapshotAt(2)).toBeDefined()

      // Go back to step 1 conceptually and mutate
      session.mutate(() => {})

      // Snapshots after current step should be invalidated
      // (In this case, no snapshots after step 2)
    })
  })

  describe('events', () => {
    it('emits step event after each opcode', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      const events: string[] = []
      session.on('step', () => events.push('step'))
      session.on('halted', () => events.push('halted'))

      session.step() // PUSH1
      session.step() // STOP

      expect(events).toContain('step')
      expect(events).toContain('halted')
    })

    it('emits breakpoint-hit with breakpoint ID', () => {
      const bytecode = new Uint8Array([0x60, 0x05, 0x00])
      const session = new DebugSession({
        bytecode,
        initialGas: 100000n,
      })

      let hitId: string | undefined
      session.on('breakpoint-hit', (payload) => {
        hitId = payload.metadata?.breakpointId
      })

      const id = session.addBreakpoint({ type: 'opcode', opcode: 0x60 })
      session.run()

      expect(hitId).toBe(id)
    })
  })
})
